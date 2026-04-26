import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { canTeacherAccessClass } from '@/lib/teacher-access';

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

// GET /api/students/[id]/academics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const canAccess = await canTeacherAccessClass(authed, student.classId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: student is not in your assigned class(es)' },
        { status: 403 }
      );
    }

    const classLevel = student.class?.level || 'PRIMARY';
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true },
    });

    // Get all exam marks for this student
    const examMarks = await db.examMark.findMany({
      where: { studentId: id },
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

    // === Performance Overview ===
    const allMarks = examMarks.map((m) => m.marks);
    const overallAverage = allMarks.length > 0
      ? Math.round((allMarks.reduce((a, b) => a + b, 0) / allMarks.length) * 100) / 100
      : 0;

    // Best / Worst subject
    const subjectAvgs: Record<string, { name: string; total: number; count: number; marks: number }> = {};
    for (const mark of examMarks) {
      const subId = mark.subjectId;
      if (!subjectAvgs[subId]) {
        subjectAvgs[subId] = { name: mark.subject.name, total: 0, count: 0, marks: 0 };
      }
      subjectAvgs[subId].total += mark.marks;
      subjectAvgs[subId].count++;
    }
    const subjectList = Object.values(subjectAvgs).map((s) => ({
      name: s.name,
      average: s.count > 0 ? Math.round((s.total / s.count) * 100) / 100 : 0,
      grade: getGrade(s.count > 0 ? s.total / s.count : 0, classLevel),
      totalMarks: s.total,
      examCount: s.count,
    }));
    subjectList.sort((a, b) => b.average - a.average);

    const bestSubject = subjectList.length > 0 ? subjectList[0] : null;
    const worstSubject = subjectList.length > 0 ? subjectList[subjectList.length - 1] : null;

    // === Exam History ===
    const examsMap: Record<string, {
      examId: string;
      examName: string;
      term: string;
      examType: string;
      subjects: { subjectName: string; marks: number; grade: string; remarks: string }[];
      totalMarks: number;
      average: number;
      grade: string;
    }> = {};

    for (const mark of examMarks) {
      const examKey = mark.examId;
      if (!examsMap[examKey]) {
        const termLabel = `${mark.exam.term.year} ${mark.exam.term.name}`;
        examsMap[examKey] = {
          examId: mark.examId,
          examName: mark.exam.name,
          term: termLabel,
          examType: mark.exam.type,
          subjects: [],
          totalMarks: 0,
          average: 0,
          grade: '',
        };
      }
      const grade = getGrade(mark.marks, classLevel);
      examsMap[examKey].subjects.push({
        subjectName: mark.subject.name,
        marks: mark.marks,
        grade,
        remarks: getRemarks(grade),
      });
      examsMap[examKey].totalMarks += mark.marks;
    }

    const examHistory = Object.values(examsMap).map((e) => {
      e.average = e.subjects.length > 0
        ? Math.round((e.totalMarks / e.subjects.length) * 100) / 100
        : 0;
      e.grade = getGrade(e.average, classLevel);
      return e;
    });

    // === Current Term Quick Stats ===
    const currentTermMarks = activeTerm
      ? examMarks.filter((m) => m.exam.termId === activeTerm.id)
      : examMarks;
    const currentTermScores = currentTermMarks.map((m) => m.marks);
    const currentTermAverage = currentTermScores.length > 0
      ? Math.round((currentTermScores.reduce((a, b) => a + b, 0) / currentTermScores.length) * 100) / 100
      : 0;
    const currentTermExamCount = new Set(currentTermMarks.map((m) => m.examId)).size;

    const currentTermSubjectAvgs: Record<string, { name: string; total: number; count: number }> = {};
    for (const mark of currentTermMarks) {
      const subId = mark.subjectId;
      if (!currentTermSubjectAvgs[subId]) {
        currentTermSubjectAvgs[subId] = { name: mark.subject.name, total: 0, count: 0 };
      }
      currentTermSubjectAvgs[subId].total += mark.marks;
      currentTermSubjectAvgs[subId].count++;
    }

    const currentTermSubjects = Object.values(currentTermSubjectAvgs)
      .map((s) => ({
        name: s.name,
        average: s.count > 0 ? Math.round((s.total / s.count) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.average - a.average);
    const currentTermBestSubject = currentTermSubjects.length > 0 ? currentTermSubjects[0] : null;
    const currentTermWorstSubject = currentTermSubjects.length > 0 ? currentTermSubjects[currentTermSubjects.length - 1] : null;

    // Calculate class rank per exam
    for (const exam of examHistory) {
      const allExamMarks = await db.examMark.findMany({
        where: { examId: exam.examId },
        select: { studentId: true, marks: true },
      });
      const studentTotals: Record<string, number> = {};
      for (const m of allExamMarks) {
        studentTotals[m.studentId] = (studentTotals[m.studentId] || 0) + m.marks;
      }
      const sorted = Object.entries(studentTotals)
        .sort(([, a], [, b]) => b - a);
      const myTotal = studentTotals[id] || 0;
      const rank = sorted.findIndex(([sid]) => sid === id) + 1;
      exam['rank'] = rank > 0 ? rank : null;
      exam['classSize'] = sorted.length;
    }

    // === Attendance Rate ===
    const attendanceRecords = await db.attendance.findMany({
      where: {
        studentId: id,
        ...(activeTerm ? { termId: activeTerm.id } : {}),
      },
    });
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const attendanceRate = totalDays > 0
      ? Math.round((presentDays / totalDays) * 1000) / 10
      : 0;

    // Monthly attendance trend
    const monthlyAttendance: Record<string, { present: number; total: number }> = {};
    for (const record of attendanceRecords) {
      const monthKey = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyAttendance[monthKey]) {
        monthlyAttendance[monthKey] = { present: 0, total: 0 };
      }
      monthlyAttendance[monthKey].total++;
      if (record.status === 'PRESENT' || record.status === 'LATE') {
        monthlyAttendance[monthKey].present++;
      }
    }
    const attendanceTrend = Object.entries(monthlyAttendance)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        rate: data.total > 0 ? Math.round((data.present / data.total) * 1000) / 10 : 0,
        present: data.present,
        total: data.total,
      }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          averageScore: overallAverage,
          totalExams: Object.keys(examsMap).length,
          totalSubjects: subjectList.length,
          bestSubject,
          worstSubject,
          attendanceRate,
          overallGrade: getGrade(overallAverage, classLevel),
        },
        quickStats: {
          termLabel: activeTerm ? `${activeTerm.year} ${activeTerm.name}` : 'All Terms',
          averageScore: currentTermAverage,
          totalExams: currentTermExamCount,
          attendanceRate,
          bestSubject: currentTermBestSubject
            ? {
                ...currentTermBestSubject,
                grade: getGrade(currentTermBestSubject.average, classLevel),
              }
            : null,
          worstSubject: currentTermWorstSubject
            ? {
                ...currentTermWorstSubject,
                grade: getGrade(currentTermWorstSubject.average, classLevel),
              }
            : null,
          overallGrade: getGrade(currentTermAverage, classLevel),
        },
        examHistory,
        subjectPerformance: subjectList,
        attendanceTrend,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching student academics:', error);
    return apiRouteError(error, 'Failed to fetch academic data');
  }
}
