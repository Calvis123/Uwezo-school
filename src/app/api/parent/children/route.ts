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

    // Find guardian links
    const guardianLinks = await db.studentGuardian.findMany({
      where: { guardianId },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    if (guardianLinks.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // For each student, fetch fee balance, attendance rate, and recent exam results
    const children = await Promise.all(
      guardianLinks.map(async (link) => {
        const student = link.student;

        // Fee balance: total fees for student's class minus payments
        const feeStructures = await db.feeStructure.findMany({
          where: { classId: student.classId },
          include: { term: true },
        });

        const payments = await db.feeTransaction.findMany({
          where: {
            studentId: student.id,
            status: 'COMPLETED',
          },
        });

        const totalFees = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const feeBalance = totalFees - totalPaid;

        // Attendance rate for current/active term
        const activeTerm = await db.term.findFirst({
          where: { status: 'ACTIVE' },
        });

        let attendanceRate = 0;
        if (activeTerm) {
          const attendanceRecords = await db.attendance.findMany({
            where: {
              studentId: student.id,
              termId: activeTerm.id,
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
          where: { studentId: student.id },
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
          },
          attendance: {
            rate: attendanceRate,
          },
          recentExam: latestExam
            ? {
                id: latestExam.id,
                name: latestExam.name,
                type: latestExam.type,
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
    });
  } catch (error: any) {
    console.error('Error fetching parent children:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}
