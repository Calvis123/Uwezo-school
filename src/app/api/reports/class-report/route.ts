import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// CBC Grading helper
function getGrade(marks: number, level?: string): string {
  if (level === 'PRE_NURSERY' || level === 'NURSERY' || level === 'PP1' || level === 'PP2' || level === 'GRADE_1' || level === 'GRADE_2' || level === 'GRADE_3') {
    if (marks >= 80) return 'EE';
    if (marks >= 65) return 'ME';
    if (marks >= 50) return 'AE';
    return 'BE';
  }
  if (level === 'GRADE_4' || level === 'GRADE_5' || level === 'GRADE_6') {
    if (marks >= 70) return '1';
    if (marks >= 60) return '2';
    if (marks >= 50) return '3';
    return '4';
  }
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  return 'E';
}

function getRemarks(grade: string): string {
  switch (grade) {
    case 'A': case 'EE': return 'Excellent';
    case 'B': case '1': return 'Very Good';
    case 'C': case 'ME': return 'Good';
    case 'D': case 'AE': case '2': return 'Fair';
    case 'E': case 'BE': case '3': case '4': return 'Needs Improvement';
    default: return '';
  }
}

// GET /api/reports/class-report?classId=xxx&examId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const examId = searchParams.get('examId');

    if (!classId) {
      return NextResponse.json(
        { success: false, error: 'classId is required' },
        { status: 400 }
      );
    }

    if (!examId) {
      return NextResponse.json(
        { success: false, error: 'examId is required' },
        { status: 400 }
      );
    }

    // Get class info
    const schoolClass = await db.schoolClass.findUnique({
      where: { id: classId },
    });

    if (!schoolClass) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get exam info
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { term: true, class: true },
    });

    if (!exam) {
      return NextResponse.json(
        { success: false, error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Get all students in the class
    const students = await db.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Get all marks for this exam
    const allMarks = await db.examMark.findMany({
      where: { examId },
      include: { subject: true },
    });

    // Get unique subjects in this exam
    const subjectIds = [...new Set(allMarks.map((m) => m.subjectId))];
    const subjects = await db.subject.findMany({
      where: { id: { in: subjectIds } },
      orderBy: { name: 'asc' },
    });

    const classLevel = schoolClass.level || 'PRIMARY';

    // Build student report data
    const studentReports = students.map((student) => {
      const studentMarks = allMarks.filter((m) => m.studentId === student.id);

      // Build marks per subject
      const subjectMarks: Record<string, number> = {};
      for (const mark of studentMarks) {
        subjectMarks[mark.subjectId] = mark.marks;
      }

      // Calculate total and average
      const totalMarks = studentMarks.reduce((sum, m) => sum + m.marks, 0);
      const average = studentMarks.length > 0
        ? Math.round((totalMarks / studentMarks.length) * 100) / 100
        : 0;
      const grade = getGrade(average, classLevel);

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.lastName} ${student.firstName}`,
        gender: student.gender,
        subjectMarks,
        totalMarks,
        average,
        grade,
        remarks: getRemarks(grade),
        subjectsTaken: studentMarks.length,
      };
    });

    // Calculate class ranking
    const ranked = [...studentReports]
      .sort((a, b) => b.totalMarks - a.totalMarks || b.average - a.average);
    ranked.forEach((report, index) => {
      report['rank'] = index + 1;
    });

    // Class averages per subject
    const subjectAverages: Record<string, { name: string; average: number; grade: string }> = {};
    for (const subject of subjects) {
      const marksForSubject = allMarks.filter((m) => m.subjectId === subject.id);
      const avg = marksForSubject.length > 0
        ? Math.round((marksForSubject.reduce((sum, m) => sum + m.marks, 0) / marksForSubject.length) * 100) / 100
        : 0;
      subjectAverages[subject.id] = {
        name: subject.name,
        average: avg,
        grade: getGrade(avg, classLevel),
      };
    }

    // Class overall average
    const classAverage = studentReports.length > 0
      ? Math.round(
          (studentReports.reduce((sum, s) => sum + s.average, 0) / studentReports.length) * 100
        ) / 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        classInfo: {
          id: schoolClass.id,
          name: schoolClass.name,
          level: schoolClass.level,
          stream: schoolClass.stream,
        },
        examInfo: {
          id: exam.id,
          name: exam.name,
          type: exam.type,
          totalMarks: exam.totalMarks,
          termName: `${exam.term.year} ${exam.term.name}`,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          classAverage: subjectAverages[s.id]?.average || 0,
          classGrade: subjectAverages[s.id]?.grade || '-',
        })),
        students: ranked,
        classAverage,
        totalStudents: students.length,
        gradingScale: classLevel,
      },
    });
  } catch (error: any) {
    console.error('Error fetching class report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch class report' },
      { status: 500 }
    );
  }
}
