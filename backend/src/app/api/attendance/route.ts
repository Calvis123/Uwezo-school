import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { getTeacherAssignedClassIds } from '@/lib/teacher-access';
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');
    const termId = searchParams.get('termId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')));

    const where: Prisma.AttendanceWhereInput = {};

    const teacherClassIds = await getTeacherAssignedClassIds(authed);
    if (teacherClassIds) {
      if (teacherClassIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { items: [], total: 0, page, limit, totalPages: 0 },
        });
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
    if (studentId) where.studentId = studentId;
    where.status = { in: [...MARKED_ATTENDANCE_STATUSES] };

    let resolvedTermId = termId;
    if (!resolvedTermId) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      resolvedTermId = activeTerm?.id || null;
    }
    if (resolvedTermId) {
      where.termId = resolvedTermId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    const [records, total] = await Promise.all([
      db.attendance.findMany({
        where,
        include: {
          student: {
            include: { class: true },
          },
          class: true,
          term: true,
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.attendance.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching attendance:', error);
    return apiRouteError(error, 'Failed to fetch attendance records');
  }
}
