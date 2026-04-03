import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // First, get the active term (needed for subsequent queries)
    const activeTerm = await db.term.findFirst({ where: { status: 'ACTIVE' } });

    // Run remaining queries in parallel
    const [
      totalStudentsResult,
      totalClasses,
      totalTeachers,
      genderDistribution,
      classesWithStudents,
      recentPayments,
      recentAttendance,
      attendanceThisTerm,
      notices,
    ] = await Promise.all([
      // 1. Total active students
      db.student.count({ where: { status: 'ACTIVE' } }),

      // 2. Total classes
      db.schoolClass.count(),

      // 3. Total teachers (users with TEACHER role)
      db.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),

      // 4. Gender distribution
      db.student.groupBy({
        by: ['gender'],
        where: { status: 'ACTIVE' },
        _count: { gender: true },
      }),

      // 5. Classes with student counts
      db.schoolClass.findMany({
        include: {
          _count: {
            select: { students: { where: { status: 'ACTIVE' } } },
          },
        },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),

      // 6. Recent fee payments (last 10)
      db.feeTransaction.findMany({
        where: { status: 'COMPLETED' },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          feeStructure: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 7. Recent attendance records (last 10)
      db.attendance.findMany({
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 8. Attendance for this term
      activeTerm
        ? db.attendance.findMany({ where: { termId: activeTerm.id } })
        : Promise.resolve([]),

      // 9. Published notices count
      db.schoolNotice.count({ where: { isPublished: true } }),
    ]);

    // Gender distribution map
    const genderMap: Record<string, number> = {};
    for (const g of genderDistribution) {
      genderMap[g.gender] = g._count.gender;
    }

    // Fee collection summary
    const [feeStructures, feeTransactionsThisTerm, activeStudents, totalSubjects] = await Promise.all([
      db.feeStructure.findMany({
        where: activeTerm ? { termId: activeTerm.id } : undefined,
      }),
      db.feeTransaction.findMany({
        where: { status: 'COMPLETED' },
        include: { feeStructure: { select: { termId: true } } },
      }),
      db.student.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, classId: true },
      }),
      db.subject.count(),
    ]);

    // Build class fee map
    const classFeeMap: Record<string, number> = {};
    for (const fs of feeStructures) {
      if (!classFeeMap[fs.classId]) classFeeMap[fs.classId] = 0;
      classFeeMap[fs.classId] += fs.amount;
    }

    // Calculate total expected fees
    let totalExpected = 0;
    for (const student of activeStudents) {
      totalExpected += classFeeMap[student.classId] || 0;
    }

    // Filter transactions to active term
    const activeTermTransactions = feeTransactionsThisTerm.filter(
      (t) => activeTerm && t.feeStructure.termId === activeTerm.id
    );
    const totalCollected = activeTermTransactions.reduce((sum, t) => sum + t.amount, 0);
    const outstanding = totalExpected - totalCollected;
    const collectionRate = totalExpected > 0
      ? Math.round((totalCollected / totalExpected) * 100 * 100) / 100
      : 0;

    // Attendance rate
    const attendanceRate = attendanceThisTerm.length > 0
      ? Math.round(
          (attendanceThisTerm.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length /
            attendanceThisTerm.length) *
            100 *
            100
        ) / 100
      : 0;

    // Students per class breakdown
    const studentsPerClass = classesWithStudents.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      level: cls.level,
      stream: cls.stream,
      studentCount: cls._count.students,
      capacity: cls.capacity,
      utilizationRate: Math.round((cls._count.students / cls.capacity) * 100 * 100) / 100,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudents: totalStudentsResult,
          totalClasses,
          totalTeachers,
          totalSubjects,
          totalNotices: notices,
          activeTerm,
        },
        genderDistribution: genderMap,
        feeCollection: {
          totalExpected,
          totalCollected,
          outstanding,
          collectionRate,
        },
        attendanceRate,
        studentsPerClass,
        recentActivities: {
          recentPayments,
          recentAttendance,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
