import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.SchoolClassWhereInput = {};
    if (level) {
      const gradeName = level.startsWith('GRADE_') ? `Grade ${level.replace('GRADE_', '')}` : null;
      const prePrimaryName = level === 'PP1' ? 'PP1' : level === 'PP2' ? 'PP2' : null;
      where.OR = [
        { level },
        ...(gradeName ? [{ name: { contains: gradeName, mode: 'insensitive' as const } }] : []),
        ...(prePrimaryName ? [{ name: { contains: prePrimaryName, mode: 'insensitive' as const } }] : []),
      ];
    }
    if (status) where.status = status;
    if (authed.role === 'TEACHER') where.teacherId = authed.id;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const classes = await db.schoolClass.findMany({
      where,
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const classesWithCount = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      stream: cls.stream,
      teacherId: cls.teacherId,
      capacity: cls.capacity,
      status: cls.status,
      studentCount: cls._count.students,
    }));

    return NextResponse.json({ success: true, data: classesWithCount });
  } catch (error: unknown) {
    console.error('Error fetching classes:', error);
    return apiRouteError(error, 'Failed to fetch classes');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const body = await request.json();
    const { name, level, stream, capacity, teacherId, status } = body;

    if (!name || !level) {
      return NextResponse.json(
        { success: false, error: 'Name and level are required' },
        { status: 400 }
      );
    }

    const existingClass = await db.schoolClass.findFirst({
      where: { name, stream: stream || null },
    });

    if (existingClass) {
      return NextResponse.json(
        { success: false, error: 'A class with this name and stream already exists' },
        { status: 409 }
      );
    }

    const newClass = await db.schoolClass.create({
      data: {
        name,
        level,
        stream: stream || null,
        capacity: capacity || 40,
        teacherId: teacherId || null,
        status: status || 'ACTIVE',
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newClass.id,
        name: newClass.name,
        level: newClass.level,
        stream: newClass.stream,
        teacherId: newClass.teacherId,
        capacity: newClass.capacity,
        status: newClass.status,
        studentCount: newClass._count.students,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating class:', error);
    return apiRouteError(error, 'Failed to create class');
  }
}
