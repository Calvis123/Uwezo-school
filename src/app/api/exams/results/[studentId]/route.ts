import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/exams/results/[studentId] - Get student exam results across all exams
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get all exam marks for this student
    const examMarks = await db.examMark.findMany({
      where: { studentId },
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
    });

    // Group by exam
    const examsMap: Record<string, {
      exam: typeof examMarks[0]['exam'];
      subjects: {
        subject: typeof examMarks[0]['subject'];
        marks: number;
        grade: string | null;
        remarks: string | null;
      }[];
      totalMarks: number;
      average: number;
    }> = {};

    for (const mark of examMarks) {
      const examKey = mark.examId;
      if (!examsMap[examKey]) {
        examsMap[examKey] = {
          exam: mark.exam,
          subjects: [],
          totalMarks: 0,
          average: 0,
        };
      }
      examsMap[examKey].subjects.push({
        subject: mark.subject,
        marks: mark.marks,
        grade: mark.grade,
        remarks: mark.remarks,
      });
      examsMap[examKey].totalMarks += mark.marks;
    }

    // Calculate averages
    for (const key of Object.keys(examsMap)) {
      const exam = examsMap[key];
      exam.average = exam.subjects.length > 0
        ? Math.round((exam.totalMarks / exam.subjects.length) * 100) / 100
        : 0;
    }

    // Group by term
    const termMap: Record<string, typeof examsMap[string][]> = {};
    for (const key of Object.keys(examsMap)) {
      const exam = examsMap[key];
      const termKey = `${exam.exam.term.year}-${exam.exam.term.name}`;
      if (!termMap[termKey]) {
        termMap[termKey] = [];
      }
      termMap[termKey].push(exam);
    }

    // Overall performance
    const allMarks = examMarks.map((m) => m.marks);
    const overallAverage = allMarks.length > 0
      ? Math.round((allMarks.reduce((a, b) => a + b, 0) / allMarks.length) * 100) / 100
      : 0;
    const bestSubject = examMarks.length > 0
      ? examMarks.reduce((best, m) => m.marks > (best?.marks || -1) ? m : best, examMarks[0])?.subject
      : null;
    const weakSubject = examMarks.length > 0
      ? examMarks.reduce((worst, m) => m.marks < (worst?.marks || Infinity) ? m : worst, examMarks[0])?.subject
      : null;

    return NextResponse.json({
      success: true,
      data: {
        student,
        results: Object.values(examsMap),
        resultsByTerm: termMap,
        summary: {
          totalExams: Object.keys(examsMap).length,
          overallAverage,
          bestSubject,
          weakSubject,
          totalSubjects: new Set(examMarks.map((m) => m.subjectId)).size,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching student results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student results' },
      { status: 500 }
    );
  }
}
