import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/parent/results/[studentId] - Get child exam results for logged-in guardian
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const guardian = await requireUser(request, { roles: ["PARENT"] });
    const { studentId } = await params;

    const link = await db.studentGuardian.findFirst({
      where: { guardianId: guardian.id, studentId },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true, status: true },
    });

    const examMarks = await db.examMark.findMany({
      where: {
        studentId,
        ...(activeTerm ? { exam: { termId: activeTerm.id } } : {}),
      },
      include: {
        exam: { include: { term: true, class: true } },
        subject: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const examsMap = new Map<
      string,
      {
        examId: string;
        examName: string;
        examType: string;
        termLabel: string;
        className: string;
        startDate: Date | null;
        endDate: Date | null;
        subjects: { subjectId: string; subjectName: string; marks: number; grade: string | null; remarks: string | null }[];
        totalMarks: number;
        average: number;
      }
    >();

    for (const mark of examMarks) {
      const key = mark.examId;
      if (!examsMap.has(key)) {
        const termLabel = `${mark.exam.term.year} ${mark.exam.term.name}`;
        examsMap.set(key, {
          examId: mark.examId,
          examName: mark.exam.name,
          examType: mark.exam.type,
          termLabel,
          className: mark.exam.class?.name || "",
          startDate: mark.exam.startDate ?? null,
          endDate: mark.exam.endDate ?? null,
          subjects: [],
          totalMarks: 0,
          average: 0,
        });
      }
      const entry = examsMap.get(key)!;
      entry.subjects.push({
        subjectId: mark.subjectId,
        subjectName: mark.subject.name,
        marks: mark.marks,
        grade: mark.grade,
        remarks: mark.remarks,
      });
      entry.totalMarks += mark.marks;
    }

    const results = Array.from(examsMap.values()).map((e) => {
      e.average = e.subjects.length > 0 ? Math.round((e.totalMarks / e.subjects.length) * 100) / 100 : 0;
      return e;
    });

    // Group by term label
    const resultsByTerm: Record<string, typeof results> = {};
    for (const exam of results) {
      if (!resultsByTerm[exam.termLabel]) resultsByTerm[exam.termLabel] = [];
      resultsByTerm[exam.termLabel].push(exam);
    }

    // Summary
    const allMarks = examMarks.map((m) => m.marks);
    const overallAverage =
      allMarks.length > 0 ? Math.round((allMarks.reduce((a, b) => a + b, 0) / allMarks.length) * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          class: student.class ? { id: student.class.id, name: student.class.name } : null,
        },
        results,
        resultsByTerm,
        summary: {
          totalExams: results.length,
          overallAverage,
          totalSubjects: new Set(examMarks.map((m) => m.subjectId)).size,
        },
        activeTerm: activeTerm
          ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
          : null,
      },
    });
  } catch (error: any) {
    const status = error?.message === "FORBIDDEN" ? 403 : error?.message === "UNAUTHORIZED" ? 401 : 500;
    if (status >= 500) console.error("Parent results error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch results" }, { status });
  }
}
