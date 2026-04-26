import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { canTeacherAccessClass } from '@/lib/teacher-access';

// POST /api/exams/marks - Batch save marks for an exam
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId, marks } = body;

    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });
    const enteredBy = authed.id;

    if (!examId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { success: false, error: 'Exam ID and marks array are required' },
        { status: 400 }
      );
    }

    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: { id: true, classId: true },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }

    const canAccessClass = await canTeacherAccessClass(authed, exam.classId);
    if (!canAccessClass) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: exam class is not assigned to this teacher' },
        { status: 403 }
      );
    }

    const studentIds = marks.map((mark) => mark.studentId).filter(Boolean);
    if (studentIds.length > 0) {
      const validStudents = await db.student.count({
        where: {
          id: { in: studentIds },
          classId: exam.classId,
        },
      });

      if (validStudents !== studentIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some submitted marks contain students outside this exam class' },
          { status: 400 }
        );
      }
    }

    const results = [];

    for (const mark of marks) {
      const { studentId, subjectId, marks: markValue, grade, remarks } = mark;

      if (!studentId || !subjectId) continue;

      // Compute grade if not provided
      let computedGrade = grade;
      if (!computedGrade) {
        if (markValue >= 80) computedGrade = 'A';
        else if (markValue >= 70) computedGrade = 'B';
        else if (markValue >= 60) computedGrade = 'C';
        else if (markValue >= 50) computedGrade = 'D';
        else computedGrade = 'E';
      }

      // Upsert: find existing or create new
      const existing = await db.examMark.findFirst({
        where: {
          examId,
          studentId,
          subjectId,
        },
      });

      let result;
      if (existing) {
        result = await db.examMark.update({
          where: { id: existing.id },
          data: {
            marks: markValue,
            grade: computedGrade,
            remarks: remarks || existing.remarks,
            enteredBy,
          },
        });
      } else {
        result = await db.examMark.create({
          data: {
            examId,
            studentId,
            subjectId,
            marks: markValue,
            grade: computedGrade,
            remarks,
            enteredBy,
          },
        });
      }

      results.push(result);
    }

    return NextResponse.json({ success: true, data: results }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error saving exam marks:', error);
    return apiRouteError(error, 'Failed to save exam marks');
  }
}
