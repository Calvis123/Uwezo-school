import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const cls = await db.schoolClass.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    let teacherName: string | null = null;
    if (cls.teacherId) {
      const teacher = await db.user.findUnique({
        where: { id: cls.teacherId },
        select: { id: true, name: true },
      });
      if (teacher) {
        teacherName = teacher.name;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        stream: cls.stream,
        teacherId: cls.teacherId,
        teacherName,
        capacity: cls.capacity,
        status: cls.status,
        studentCount: cls._count.students,
        createdAt: cls.createdAt,
        updatedAt: cls.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching class:', error);
    return apiRouteError(error, 'Failed to fetch class');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;
    const body = await request.json();

    const cls = await db.schoolClass.findUnique({ where: { id } });
    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const { name, level, stream, capacity, teacherId, status } = body;

    const updated = await db.schoolClass.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(level !== undefined && { level }),
        ...(stream !== undefined && { stream: stream || null }),
        ...(capacity !== undefined && { capacity }),
        ...(teacherId !== undefined && { teacherId: teacherId || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        _count: {
          select: { students: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        level: updated.level,
        stream: updated.stream,
        teacherId: updated.teacherId,
        capacity: updated.capacity,
        status: updated.status,
        studentCount: updated._count.students,
      },
    });
  } catch (error: unknown) {
    console.error('Error updating class:', error);
    return apiRouteError(error, 'Failed to update class');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;

    const cls = await db.schoolClass.findUnique({ where: { id } });
    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const updated = await db.schoolClass.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error deleting class:', error);
    return apiRouteError(error, 'Failed to delete class');
  }
}
