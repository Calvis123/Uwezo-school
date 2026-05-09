import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance';
import { getParentPrimaryStudentId } from '@/lib/parent-access';
import { summarizeStudentFeeBalance } from '@/lib/fee-balance';

export async function GET(request: NextRequest) {
  try {
    const guardian = await requireUser(request, { roles: ['PARENT'] });
    const guardianId = guardian.id;
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true, status: true },
    });

    const primaryStudentId = await getParentPrimaryStudentId(guardianId);
    if (!primaryStudentId) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const scopedLinks = await db.studentGuardian.findMany({
      where: { guardianId, studentId: primaryStudentId },
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
      take: 1,
    });

    // For each student, fetch fee balance, attendance rate, and recent exam results
    const children = await Promise.all(
      scopedLinks.map(async (link) => {
        const student = link.student;

        // Fee balance: total fees for student's class minus payments
        const feeStructures = await db.feeStructure.findMany({
          where: {
            ...(activeTerm ? { termId: activeTerm.id } : {}),
            status: 'ACTIVE',
          },
          include: { term: true },
        });

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
        const activeTransportAssignment = activeTerm
          ? await db.transportAssignment.findFirst({
              where: {
                studentId: student.id,
                termId: activeTerm.id,
                status: 'ACTIVE',
              },
              select: {
                transportMode: true,
                bus: { select: { routeName: true } },
              },
            })
          : null;
        const { totalFees, totalPaid, balance: feeBalance } = summarizeStudentFeeBalance(
          feeStructures,
          payments,
          {
            ...student,
            transportRouteName: activeTransportAssignment?.bus?.routeName || null,
            transportMode: activeTransportAssignment?.transportMode || null,
          }
        );

        // Attendance rate for current/active term
        let attendanceRate = 0;
        if (activeTerm) {
          const attendanceRecords = await db.attendance.findMany({
            where: {
              studentId: student.id,
              termId: activeTerm.id,
              status: { in: [...MARKED_ATTENDANCE_STATUSES] },
            },
          });

          if (attendanceRecords.length > 0) {
            const presentCount = attendanceRecords.filter(
              (a) => a.status === 'PRESENT' || a.status === 'LATE'
            ).length;
            attendanceRate = Math.round(
              (presentCount / attendanceRecords.length) * 100
            );
          }
        }

        // Recent exam results (last completed exam)
        const recentExamMarks = await db.examMark.findMany({
          where: {
            studentId: student.id,
            ...(activeTerm ? { exam: { termId: activeTerm.id } } : {}),
          },
          include: {
            exam: {
              include: {
                term: true,
                class: true,
              },
            },
            subject: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        });

        // Get the latest exam info
        const latestExam = recentExamMarks.length > 0
          ? recentExamMarks[0].exam
          : null;

        // Average score for latest exam
        const examScores = recentExamMarks.length > 0
          ? recentExamMarks
              .filter((m) => m.examId === latestExam?.id)
              .map((m) => m.marks)
          : [];

        const avgScore = examScores.length > 0
          ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
          : null;

        // Calculate grade
        const getGrade = (score: number, level: string): string => {
          if (['PRE_NURSERY', 'NURSERY', 'GRADE_1', 'GRADE_2', 'GRADE_3'].includes(level)) {
            if (score >= 80) return 'EE';
            if (score >= 65) return 'ME';
            if (score >= 50) return 'AE';
            return 'BE';
          } else {
            if (score >= 80) return 'A';
            if (score >= 65) return 'B';
            if (score >= 50) return 'C';
            if (score >= 40) return 'D';
            return 'E';
          }
        };

        return {
          id: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          gender: student.gender,
          status: student.status,
          photo: student.photo,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
          class: student.class
            ? {
                id: student.class.id,
                name: student.class.name,
                level: student.class.level,
                stream: student.class.stream,
              }
            : null,
          fees: {
            totalFees,
            totalPaid,
            balance: feeBalance,
            term: activeTerm
              ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
              : null,
          },
          attendance: {
            rate: attendanceRate,
            term: activeTerm
              ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
              : null,
          },
          recentExam: latestExam
            ? {
                id: latestExam.id,
                name: latestExam.name,
                type: latestExam.type,
                termId: latestExam.termId,
                avgScore,
                grade: avgScore ? getGrade(avgScore, student.class?.level || 'PRIMARY') : null,
                subjectsCount: examScores.length,
              }
            : null,
          recentResults: recentExamMarks.map((m) => ({
            id: m.id,
            subject: m.subject.name,
            marks: m.marks,
            grade: m.grade,
            remarks: m.remarks,
            examName: m.exam.name,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: children,
      meta: {
        activeTerm: activeTerm
          ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
          : null,
      },
    });
  } catch (error: any) {
    const status = error?.message === 'FORBIDDEN' ? 403 : error?.message === 'UNAUTHORIZED' ? 401 : 500;
    if (status >= 500) console.error('Error fetching parent children:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch children' }, { status });
  }
}
