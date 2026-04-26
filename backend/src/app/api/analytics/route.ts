import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { FINANCE_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { Prisma } from '@prisma/client';
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');

    // Build date filters — only apply if 'from'/'to' params are provided
    // When no date params are given (e.g. "All Time"), don't restrict by date
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const classWhere: Prisma.SchoolClassWhereInput = { status: 'ACTIVE' };
    if (classId) classWhere.id = classId;

    // Fetch classes with student counts
    const classes = await db.schoolClass.findMany({
      where: classWhere,
      include: {
        _count: {
          select: { students: { where: { status: 'ACTIVE' } } },
        },
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true, firstName: true, lastName: true, gender: true, usesTransport: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch fee transactions (filtered by date range if provided)
    const feeWhereClause: Prisma.FeeTransactionWhereInput = { status: 'COMPLETED' };
    if (fromDate && toDate) {
      feeWhereClause.createdAt = { gte: fromDate, lte: toDate };
    }
    if (classId) {
      feeWhereClause.student = { classId };
    }
    if (termId) {
      feeWhereClause.feeStructure = { termId };
    }
    const feeTransactions = await db.feeTransaction.findMany({
      where: feeWhereClause,
      select: {
        amount: true,
        createdAt: true,
        studentId: true,
      },
    });

    // Fetch exam marks
    const examWhere: Prisma.ExamMarkWhereInput = {};
    if (classId || termId) {
      examWhere.exam = {};
      if (classId) examWhere.exam.classId = classId;
      if (termId) examWhere.exam.termId = termId;
    }
    const examMarks = await db.examMark.findMany({
      where: examWhere,
      include: {
        exam: { include: { class: { select: { id: true, name: true } } } },
        student: { select: { id: true, firstName: true, lastName: true, classId: true } },
        subject: { select: { name: true } },
      },
    });

    // Fetch attendance (filtered by date range if provided)
    const attWhereClause: Prisma.AttendanceWhereInput = {};
    attWhereClause.status = { in: [...MARKED_ATTENDANCE_STATUSES] };
    if (fromDate && toDate) {
      attWhereClause.date = { gte: fromDate, lte: toDate };
    }
    if (classId) {
      attWhereClause.classId = classId;
    }
    if (termId) {
      attWhereClause.termId = termId;
    }
    const attendanceRecords = await db.attendance.findMany({
      where: attWhereClause,
      select: {
        status: true,
        date: true,
        classId: true,
        studentId: true,
      },
    });

    // Fetch fee structures for outstanding calculation
    const feeStructures = await db.feeStructure.findMany({
      where: {
        status: 'ACTIVE',
        ...(classId ? { classId } : {}),
        ...(termId ? { termId } : {}),
      },
      include: {
        class: true,
      },
    });

    // Get selected term (or active term) for term-scoped analytics
    const [activeTerm, selectedTerm] = await Promise.all([
      db.term.findFirst({
        where: { status: 'ACTIVE' },
      }),
      termId
        ? db.term.findUnique({
            where: { id: termId },
          })
        : Promise.resolve(null),
    ]);
    const analyticsTerm = selectedTerm ?? activeTerm;

    // ==================== Compute Analytics ====================

    const feeStructuresByClassId = feeStructures.reduce<Record<string, typeof feeStructures>>((acc, structure) => {
      if (!acc[structure.classId]) acc[structure.classId] = [];
      acc[structure.classId].push(structure);
      return acc;
    }, {});

    const studentExpectedFees: Record<string, { totalRequired: number; classId: string; name: string }> = {};
    for (const cls of classes) {
      const classStructures = feeStructuresByClassId[cls.id] || [];
      for (const student of cls.students) {
        let expected = 0;
        for (const structure of classStructures) {
          if (structure.category === 'TRANSPORT' && !student.usesTransport) continue;
          expected += structure.amount;
        }
        studentExpectedFees[student.id] = {
          totalRequired: expected,
          classId: cls.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
        };
      }
    }

    // 1. Total students
    const totalStudents = classes.reduce((sum, c) => sum + c._count.students, 0);

    // 2. Gender distribution per class
    const genderDistribution = classes.map((cls) => {
      const males = cls.students.filter(s => s.gender === 'MALE').length;
      const females = cls.students.filter(s => s.gender === 'FEMALE').length;
      return {
        className: cls.name,
        classId: cls.id,
        male: males,
        female: females,
        total: cls._count.students,
      };
    });

    // 3. Monthly fee collection
    const monthlyFees: Record<string, { collected: number; transactions: number }> = {};
    feeTransactions.forEach((t) => {
      const month = new Date(t.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthlyFees[month]) monthlyFees[month] = { collected: 0, transactions: 0 };
      monthlyFees[month].collected += t.amount;
      monthlyFees[month].transactions += 1;
    });

    const feeCollectionMonthly = Object.entries(monthlyFees).map(([month, data]) => ({
      month,
      collected: Math.round(data.collected),
      transactions: data.transactions,
    }));

    const totalRevenue = feeTransactions.reduce((sum, t) => sum + t.amount, 0);

    // 4. Attendance trends (monthly)
    const monthlyAttendance: Record<string, { total: number; present: number }> = {};
    attendanceRecords.forEach((a) => {
      const month = new Date(a.date).toLocaleString('default', { month: 'short' });
      if (!monthlyAttendance[month]) monthlyAttendance[month] = { total: 0, present: 0 };
      monthlyAttendance[month].total += 1;
      if (a.status === 'PRESENT' || a.status === 'LATE') {
        monthlyAttendance[month].present += 1;
      }
    });

    const attendanceTrends = Object.entries(monthlyAttendance).map(([month, data]) => ({
      month,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100 * 10) / 10 : 0,
      total: data.total,
      present: data.present,
    }));

    const avgAttendanceRate = attendanceTrends.length > 0
      ? Math.round(attendanceTrends.reduce((sum, a) => sum + a.rate, 0) / attendanceTrends.length * 10) / 10
      : 0;

    // 5. Class performance (average exam scores)
    const classScores: Record<string, { total: number; count: number; className: string }> = {};
    examMarks.forEach((m) => {
      const classId = m.exam.class?.id || 'unknown';
      if (!classScores[classId]) {
        classScores[classId] = { total: 0, count: 0, className: m.exam.class?.name || 'Unknown' };
      }
      classScores[classId].total += m.marks;
      classScores[classId].count += 1;
    });

    const classPerformance = Object.values(classScores).map(c => ({
      className: c.className,
      averageScore: c.count > 0 ? Math.round((c.total / c.count) * 10) / 10 : 0,
    })).sort((a, b) => b.averageScore - a.averageScore);

    // 6. Top/Bottom students
    const studentScores: Record<string, { total: number; count: number; name: string; classId: string; className: string }> = {};
    examMarks.forEach((m) => {
      const sId = m.student.id;
      if (!studentScores[sId]) {
        studentScores[sId] = {
          total: 0,
          count: 0,
          name: `${m.student.firstName} ${m.student.lastName}`,
          classId: m.student.classId,
          className: m.exam.class?.name || 'Unknown',
        };
      }
      studentScores[sId].total += m.marks;
      studentScores[sId].count += 1;
    });

    const studentAverages = Object.values(studentScores)
      .filter(s => s.count >= 3)
      .map(s => ({ ...s, averageScore: Math.round((s.total / s.count) * 10) / 10 }))
      .sort((a, b) => b.averageScore - a.averageScore);

    const topStudents = studentAverages.slice(0, 10);
    const bottomStudents = [...studentAverages].reverse().slice(0, 10);

    // 7. Fee defaulters
    const studentFees: Record<string, { totalRequired: number; totalPaid: number; name: string; classId: string }> = {};
    Object.entries(studentExpectedFees).forEach(([studentId, info]) => {
      studentFees[studentId] = {
        totalRequired: info.totalRequired,
        totalPaid: 0,
        name: info.name,
        classId: info.classId,
      };
    });

    feeTransactions.forEach((t) => {
      if (studentFees[t.studentId]) {
        studentFees[t.studentId].totalPaid += t.amount;
      }
    });

    const feeDefaulters = Object.values(studentFees)
      .filter(f => f.totalRequired > 0 && (f.totalRequired - f.totalPaid) > f.totalRequired * 0.5)
      .sort((a, b) => (b.totalRequired - b.totalPaid) - (a.totalRequired - a.totalPaid))
      .slice(0, 20);

    // 8. Top class
    const topClass = classPerformance.length > 0 ? classPerformance[0] : null;

    // 9. Class summary
    const classSummary = classes.map((cls) => {
      const perf = classPerformance.find(cp => cp.className === cls.name)
      const attKey = Object.keys(monthlyAttendance)
      const avgAtt = attKey.length > 0
        ? Math.round(attKey.reduce((sum, key) => {
            const d = monthlyAttendance[key]
            return sum + (d.total > 0 ? (d.present / d.total) * 100 : 0)
          }, 0) / attKey.length * 10) / 10
        : 0

      return {
        className: cls.name,
        classId: cls.id,
        students: cls._count.students,
        capacity: cls.capacity,
        averageScore: perf?.averageScore || 0,
        attendanceRate: avgAtt,
      }
    })

    // 10. Revenue projection
    const monthsSoFar = new Date().getMonth() + 1
    const monthlyAverage = monthsSoFar > 0 ? totalRevenue / monthsSoFar : 0
    const projectedAnnual = Math.round(monthlyAverage * 12)

    // ==================== NEW ANALYTICS ====================

    // 11. Enrollment by Level (grouped: PP1-PP2, Grade 1-3, Grade 4-6, Grade 7-8, Grade 9)
    const levelGroups: Record<string, string> = {
      'PRE_NURSERY': 'Pre-Primary (PP1-PP2)',
      'NURSERY': 'Pre-Primary (PP1-PP2)',
      'LOWER_PRIMARY': 'Lower Primary (Gr 1-3)',
      'UPPER_PRIMARY': 'Upper Primary (Gr 4-6)',
      'JUNIOR_SECONDARY': 'Junior Secondary (Gr 7-9)',
    };

    const enrollmentByLevel: Record<string, { count: number; male: number; female: number }> = {};
    classes.forEach((cls) => {
      const group = levelGroups[cls.level] || cls.level;
      if (!enrollmentByLevel[group]) enrollmentByLevel[group] = { count: 0, male: 0, female: 0 };
      enrollmentByLevel[group].count += cls._count.students;
      enrollmentByLevel[group].male += cls.students.filter(s => s.gender === 'MALE').length;
      enrollmentByLevel[group].female += cls.students.filter(s => s.gender === 'FEMALE').length;
    });

    const enrollmentByLevelArray = Object.entries(enrollmentByLevel).map(([level, data]) => ({
      level,
      count: data.count,
      male: data.male,
      female: data.female,
    }));

    // 12. Fee Collection by Class
    const feeByClass = classes.map((cls) => {
      const totalRequired = cls.students.reduce((sum, student) => {
        return sum + (studentExpectedFees[student.id]?.totalRequired || 0);
      }, 0);

      // Count payments from students in this class
      const studentIds = cls.students.map(s => s.id);
      const classPayments = feeTransactions.filter(t => studentIds.includes(t.studentId));
      const totalPaid = classPayments.reduce((sum, t) => sum + t.amount, 0);

      const rate = totalRequired > 0 ? Math.round((totalPaid / totalRequired) * 100 * 10) / 10 : 0;

      return {
        className: cls.name,
        classId: cls.id,
        totalRequired: Math.round(totalRequired),
        totalPaid: Math.round(totalPaid),
        outstanding: Math.round(totalRequired - totalPaid),
        collectionRate: rate,
        transactionCount: classPayments.length,
      };
    });

    // 14. Transport overview
    const [schoolBuses, activeTermTransportStructures] = await Promise.all([
      db.schoolBus.findMany({
        select: { id: true, status: true, capacity: true, currentStudents: true },
      }),
      analyticsTerm
        ? db.feeStructure.findMany({
            where: {
              status: 'ACTIVE',
              termId: analyticsTerm.id,
              category: 'TRANSPORT',
              ...(classId ? { classId } : {}),
            },
            select: { id: true },
          })
        : Promise.resolve([] as Array<{ id: string }>),
    ]);

    const transportUsers = classes.flatMap((cls) =>
      cls.students.filter((student) => student.usesTransport)
    );
    const transportUserIds = transportUsers.map((student) => student.id);
    const activeTermTransportStructureIds = activeTermTransportStructures.map((row) => row.id);

    let assignedTransportCount = 0;
    let paidTransportStudentCount = 0;
    if (analyticsTerm?.id && transportUserIds.length > 0) {
      const [assignments, paidTransportRows] = await Promise.all([
        db.transportAssignment.findMany({
          where: {
            termId: analyticsTerm.id,
            status: 'ACTIVE',
            studentId: { in: transportUserIds },
            ...(classId ? { classId } : {}),
          },
          select: { studentId: true },
        }),
        activeTermTransportStructureIds.length
          ? db.feeTransaction.findMany({
              where: {
                status: 'COMPLETED',
                feeStructureId: { in: activeTermTransportStructureIds },
                studentId: { in: transportUserIds },
              },
              select: { studentId: true },
            })
          : Promise.resolve([] as Array<{ studentId: string }>),
      ]);

      assignedTransportCount = new Set(assignments.map((row) => row.studentId)).size;
      paidTransportStudentCount = new Set(paidTransportRows.map((row) => row.studentId)).size;
    }

    const totalCapacity = schoolBuses.reduce((sum, bus) => sum + bus.capacity, 0);
    const activeBuses = schoolBuses.filter((bus) => bus.status === 'ACTIVE').length;
    const currentRiders = schoolBuses.reduce((sum, bus) => sum + (bus.currentStudents || 0), 0);
    const utilizationRate = totalCapacity > 0 ? Math.round((currentRiders / totalCapacity) * 1000) / 10 : 0;
    const totalTransportUsers = transportUsers.length;
    const unpaidTransportUsers = Math.max(0, totalTransportUsers - paidTransportStudentCount);

    // 13. Attendance by Class (for current active term)
    let attendanceByClass: { className: string; classId: string; rate: number; total: number; present: number }[] = [];
    if (analyticsTerm) {
      const attendanceByClassWhere: Prisma.AttendanceWhereInput = {
        termId: analyticsTerm.id,
        status: { in: [...MARKED_ATTENDANCE_STATUSES] },
        ...(classId ? { classId } : {}),
      };
      if (fromDate && toDate) {
        attendanceByClassWhere.date = { gte: fromDate, lte: toDate };
      }
      const termAttendanceRecords = await db.attendance.findMany({
        where: attendanceByClassWhere,
        select: {
          classId: true,
          status: true,
        },
      });

      const termAttByClass: Record<string, { total: number; present: number }> = {};
      for (const att of termAttendanceRecords) {
        if (!termAttByClass[att.classId]) termAttByClass[att.classId] = { total: 0, present: 0 };
        termAttByClass[att.classId].total++;
        if (att.status === 'PRESENT' || att.status === 'LATE') termAttByClass[att.classId].present++;
      }

      attendanceByClass = classes.map((cls) => {
        const att = termAttByClass[cls.id];
        return {
          className: cls.name,
          classId: cls.id,
          rate: att && att.total > 0 ? Math.round((att.present / att.total) * 100 * 10) / 10 : 0,
          total: att?.total || 0,
          present: att?.present || 0,
        };
      }).sort((a, b) => b.rate - a.rate);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalStudents,
          totalClasses: classes.length,
          activeClasses: classes.filter(c => c.status === 'ACTIVE').length,
          avgAttendanceRate,
          topClass,
          projectedAnnual,
          monthlyAverage: Math.round(monthlyAverage),
          growthRate: feeCollectionMonthly.length >= 2
            ? Math.round(((feeCollectionMonthly[feeCollectionMonthly.length - 1].collected - feeCollectionMonthly[0].collected) / (feeCollectionMonthly[0].collected || 1)) * 100)
            : 0,
        },
        feeCollectionMonthly,
        attendanceTrends,
        classPerformance,
        genderDistribution,
        topStudents,
        bottomStudents,
        feeDefaulters,
        classSummary,
        // NEW data
        enrollmentByLevel: enrollmentByLevelArray,
        feeByClass,
        attendanceByClass,
        transportOverview: {
          totalBuses: schoolBuses.length,
          activeBuses,
          totalCapacity,
          assignedStudents: assignedTransportCount,
          currentRiders,
          utilizationRate,
          transportUsers: totalTransportUsers,
          paidTransportUsers: paidTransportStudentCount,
          unpaidTransportUsers,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    return apiRouteError(error, 'Failed to fetch analytics');
  }
}
