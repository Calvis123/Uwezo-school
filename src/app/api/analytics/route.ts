import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build date filters
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    const fromDate = from ? new Date(from) : startOfYear;
    const toDate = to ? new Date(to) : endOfYear;

    // Fetch classes with student counts
    const classes = await db.schoolClass.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: { students: { where: { status: 'ACTIVE' } } },
        },
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true, gender: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Fetch fee transactions for the year
    const feeTransactions = await db.feeTransaction.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        status: 'COMPLETED',
      },
      select: {
        amount: true,
        createdAt: true,
        studentId: true,
      },
    });

    // Fetch exam marks
    const examMarks = await db.examMark.findMany({
      include: {
        exam: { include: { class: { select: { id: true, name: true } } } },
        student: { select: { id: true, firstName: true, lastName: true, classId: true } },
        subject: { select: { name: true } },
      },
    });

    // Fetch attendance
    const attendanceRecords = await db.attendance.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
      },
      select: {
        status: true,
        date: true,
        classId: true,
        studentId: true,
      },
    });

    // Fetch fee structures for outstanding calculation
    const feeStructures = await db.feeStructure.findMany({
      where: { status: 'ACTIVE' },
      include: {
        class: true,
      },
    });

    // ==================== Compute Analytics ====================

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
    const studentScores: Record<string, { total: number; count: number; name: string; classId: string }> = {};
    examMarks.forEach((m) => {
      const sId = m.student.id;
      if (!studentScores[sId]) {
        studentScores[sId] = {
          total: 0,
          count: 0,
          name: `${m.student.firstName} ${m.student.lastName}`,
          classId: m.student.classId,
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
    feeStructures.forEach((fs) => {
      // Find students in this class
      const cls = classes.find(c => c.id === fs.classId);
      if (cls) {
        cls.students.forEach((s) => {
          if (!studentFees[s.id]) {
            studentFees[s.id] = { totalRequired: 0, totalPaid: 0, name: '', classId: fs.classId };
          }
          studentFees[s.id].totalRequired += fs.amount;
        });
      }
    });

    feeTransactions.forEach((t) => {
      if (studentFees[t.studentId]) {
        studentFees[t.studentId].totalPaid += t.amount;
      }
    });

    // Populate names from exam marks
    examMarks.forEach((m) => {
      if (studentFees[m.student.id]) {
        studentFees[m.student.id].name = `${m.student.firstName} ${m.student.lastName}`;
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
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
