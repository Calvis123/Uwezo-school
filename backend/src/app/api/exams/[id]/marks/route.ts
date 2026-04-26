import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { canTeacherAccessClass } from '@/lib/teacher-access';

// GET /api/exams/[id]/marks - Get all marks for an exam
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        class: true,
        term: true,
      },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }

    const canAccess = await canTeacherAccessClass(authed, exam.classId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: exam class is not assigned to this teacher' },
        { status: 403 }
      );
    }

    // Get students in the class
    const students = await db.student.findMany({
      where: { classId: exam.classId, status: 'ACTIVE' },
      orderBy: { lastName: 'asc' },
    });

    // Get subjects for the class level
    const subjects = await db.subject.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all marks for this exam
    const marks = await db.examMark.findMany({
      where: { examId: id },
      include: {
        student: true,
        subject: true,
      },
    });

    // Organize marks into a grid: student x subject
    const marksGrid: Record<string, Record<string, { marks: number; grade: string; remarks: string | null; id: string }>> = {};

    for (const mark of marks) {
      if (!marksGrid[mark.studentId]) {
        marksGrid[mark.studentId] = {};
      }
      marksGrid[mark.studentId][mark.subjectId] = {
        marks: mark.marks,
        grade: mark.grade || '',
        remarks: mark.remarks,
        id: mark.id,
      };
    }

    // Calculate student totals and averages
    const studentResults = students.map((student) => {
      const studentMarks = marksGrid[student.id] || {};
      const subjectScores = Object.values(studentMarks);
      const totalMarks = subjectScores.reduce((sum, s) => sum + s.marks, 0);
      const subjectsCount = subjectScores.length;
      const average = subjectsCount > 0 ? Math.round((totalMarks / subjectsCount) * 100) / 100 : 0;

      return {
        student,
        marks: studentMarks,
        totalMarks,
        average,
      };
    });

    // Sort by total marks descending
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks);

    return NextResponse.json({
      success: true,
      data: {
        exam,
        subjects,
        students: studentResults,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching exam marks:', error);
    return apiRouteError(error, 'Failed to fetch exam marks');
  }
}
