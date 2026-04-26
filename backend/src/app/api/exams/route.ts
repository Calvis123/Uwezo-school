import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { getTeacherAssignedClassIds } from '@/lib/teacher-access';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Prisma.ExamWhereInput = {};
    const teacherClassIds = await getTeacherAssignedClassIds(authed);
    if (teacherClassIds) {
      if (teacherClassIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      if (classId && !teacherClassIds.includes(classId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: class is not assigned to this teacher' },
          { status: 403 }
        );
      }
      where.classId = classId || { in: teacherClassIds };
    } else if (classId) {
      where.classId = classId;
    }
    if (termId) where.termId = termId;
    if (status) where.status = status;
    if (type) where.type = type;

    const exams = await db.exam.findMany({
      where,
      include: {
        class: true,
        term: true,
        _count: {
          select: { marks: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error: unknown) {
    console.error('Error fetching exams:', error);
    return apiRouteError(error, 'Failed to fetch exams');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const body = await request.json();
    const { name, termId, classId, type, startDate, endDate, totalMarks } = body;

    if (!name || !termId || !classId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Name, term, class, start date, and end date are required' },
        { status: 400 }
      );
    }

    const teacherClassIds = await getTeacherAssignedClassIds(authed);
    if (teacherClassIds && !teacherClassIds.includes(classId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: you can only create exams for your assigned class(es)' },
        { status: 403 }
      );
    }

    const exam = await db.exam.create({
      data: {
        name,
        termId,
        classId,
        type: type || 'END_TERM',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalMarks: totalMarks || 100,
      },
      include: {
        class: true,
        term: true,
      },
    });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating exam:', error);
    return apiRouteError(error, 'Failed to create exam');
  }
}
