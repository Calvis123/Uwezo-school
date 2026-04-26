import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance';

export async function GET(request: NextRequest) {
  try {
    const guardian = await requireUser(request, { roles: ['PARENT'] });
    const guardianId = guardian.id;

    // Find guardian info
    // (Already validated above)

    // Find linked children
    const guardianLinks = await db.studentGuardian.findMany({
      where: { guardianId },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: { class: true },
        },
      },
    });

    // Parent portal policy: one parent login maps to one primary student profile.
    // If historical data has multiple links, use the most recently linked student.
    const scopedLinks = guardianLinks.slice(0, 1);
    const students = scopedLinks.map((l) => l.student);

    // Get active term
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
    });

    // Children summary with key stats
    const childrenSummary = await Promise.all(
      scopedLinks.map(async (link) => {
        const student = link.student;

        // Fee balance
        const feeStructures = await db.feeStructure.findMany({
          where: {
            classId: student.classId,
            ...(activeTerm ? { termId: activeTerm.id } : {}),
          },
        });
        const applicableFeeStructures = feeStructures.filter(
          (structure) => structure.category !== 'TRANSPORT' || student.usesTransport
        );
        const payments = await db.feeTransaction.findMany({
          where: {
            studentId: student.id,
            status: 'COMPLETED',
            ...(activeTerm
              ? {
                  feeStructure: {
                    termId: activeTerm.id,
                  },
                }
              : {}),
          },
        });
        const applicableStructureIds = new Set(applicableFeeStructures.map((structure) => structure.id));
        const applicablePayments = payments.filter((payment) =>
          applicableStructureIds.has(payment.feeStructureId)
        );
        const totalFees = applicableFeeStructures.reduce((s, f) => s + f.amount, 0);
        const totalPaid = applicablePayments.reduce((s, p) => s + p.amount, 0);

        // Attendance rate for active term
        let attendanceRate = 0;
        if (activeTerm) {
          const records = await db.attendance.findMany({
            where: {
              studentId: student.id,
              termId: activeTerm.id,
              status: { in: [...MARKED_ATTENDANCE_STATUSES] },
            },
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
          where: {
            studentId: student.id,
            ...(activeTerm ? { exam: { termId: activeTerm.id } } : {}),
          },
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
      scopedLinks.map(async (link) => {
        const student = link.student;
        if (!activeTerm) return { studentId: student.id, records: [] };

        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const records = await db.attendance.findMany({
          where: {
            studentId: student.id,
            termId: activeTerm.id,
            status: { in: [...MARKED_ATTENDANCE_STATUSES] },
            date: { lte: endOfMonth },
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
    const status = error?.message === 'FORBIDDEN' ? 403 : error?.message === 'UNAUTHORIZED' ? 401 : 500;
    if (status >= 500) console.error('Error fetching parent dashboard:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status });
  }
}
