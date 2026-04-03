import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guardianId = searchParams.get('guardianId');

    if (!guardianId) {
      return NextResponse.json(
        { success: false, error: 'guardianId is required' },
        { status: 400 }
      );
    }

    // Find guardian info
    const guardian = await db.user.findUnique({
      where: { id: guardianId },
    });

    if (!guardian) {
      return NextResponse.json(
        { success: false, error: 'Guardian not found' },
        { status: 404 }
      );
    }

    // Find linked children
    const guardianLinks = await db.studentGuardian.findMany({
      where: { guardianId },
      include: {
        student: {
          include: { class: true },
        },
      },
    });

    const students = guardianLinks.map((l) => l.student);

    // Get active term
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Children summary with key stats
    const childrenSummary = await Promise.all(
      guardianLinks.map(async (link) => {
        const student = link.student;

        // Fee balance
        const feeStructures = await db.feeStructure.findMany({
          where: { classId: student.classId },
        });
        const payments = await db.feeTransaction.findMany({
          where: { studentId: student.id, status: 'COMPLETED' },
        });
        const totalFees = feeStructures.reduce((s, f) => s + f.amount, 0);
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

        // Attendance rate for active term
        let attendanceRate = 0;
        if (activeTerm) {
          const records = await db.attendance.findMany({
            where: { studentId: student.id, termId: activeTerm.id },
          });
          if (records.length > 0) {
            attendanceRate = Math.round(
              (records.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length /
                records.length) *
                100
            );
          }
        }

        // Latest exam
        const latestMarks = await db.examMark.findMany({
          where: { studentId: student.id },
          include: { exam: true, subject: true },
          orderBy: { createdAt: 'desc' },
          take: 6,
        });

        const avgScore =
          latestMarks.length > 0
            ? Math.round(
                latestMarks
                  .filter((m) => m.examId === latestMarks[0].examId)
                  .reduce((s, m) => s + m.marks, 0) /
                  latestMarks.filter((m) => m.examId === latestMarks[0].examId).length
              )
            : null;

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          gender: student.gender,
          relationship: link.relationship,
          class: student.class
            ? { id: student.class.id, name: student.class.name, level: student.class.level, stream: student.class.stream }
            : null,
          fees: { totalFees, totalPaid, balance: totalFees - totalPaid },
          attendance: { rate: attendanceRate },
          recentExam: latestMarks.length > 0
            ? { name: latestMarks[0].exam.name, avgScore }
            : null,
        };
      })
    );

    // Total fee balances across all children
    const totalFeesDue = childrenSummary.reduce((s, c) => s + c.fees.totalFees, 0);
    const totalFeesPaid = childrenSummary.reduce((s, c) => s + c.fees.totalPaid, 0);
    const totalFeesBalance = totalFeesDue - totalFeesPaid;
    const avgAttendance =
      childrenSummary.length > 0
        ? Math.round(childrenSummary.reduce((s, c) => s + c.attendance.rate, 0) / childrenSummary.length)
        : 0;

    // Upcoming events (from school notices targeted at parents)
    const notices = await db.schoolNotice.findMany({
      where: {
        isPublished: true,
        targetRoles: { in: ['ALL', 'PARENT'] },
        publishedAt: { lte: new Date() },
        expiresAt: { gte: new Date() },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    // Recent notices (last 3, all parent-relevant)
    const recentNotices = await db.schoolNotice.findMany({
      where: {
        isPublished: true,
        targetRoles: { in: ['ALL', 'PARENT'] },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });

    // Attendance overview per child for the current month
    const attendanceOverview = await Promise.all(
      guardianLinks.map(async (link) => {
        const student = link.student;
        if (!activeTerm) return { studentId: student.id, records: [] };

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const records = await db.attendance.findMany({
          where: {
            studentId: student.id,
            termId: activeTerm.id,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          orderBy: { date: 'asc' },
        });

        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          records: records.map((r) => ({
            date: r.date,
            status: r.status,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        guardian: {
          id: guardian.id,
          name: guardian.name,
          email: guardian.email,
          phone: guardian.phone,
          role: guardian.role,
        },
        childrenSummary,
        feeOverview: {
          totalFeesDue,
          totalFeesPaid,
          totalFeesBalance,
          collectionRate: totalFeesDue > 0 ? Math.round((totalFeesPaid / totalFeesDue) * 100) : 0,
        },
        attendanceOverview: {
          averageRate: avgAttendance,
          perChild: attendanceOverview,
        },
        activeTerm: activeTerm
          ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
          : null,
        upcomingEvents: notices,
        recentNotices,
      },
    });
  } catch (error: any) {
    console.error('Error fetching parent dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
