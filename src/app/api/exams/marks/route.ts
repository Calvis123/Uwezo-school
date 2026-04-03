import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/exams/marks - Batch save marks for an exam
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId, marks, enteredBy } = body;

    if (!examId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { success: false, error: 'Exam ID and marks array are required' },
        { status: 400 }
      );
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
            enteredBy: enteredBy || existing.enteredBy,
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
  } catch (error: any) {
    console.error('Error saving exam marks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save exam marks' },
      { status: 500 }
    );
  }
}
