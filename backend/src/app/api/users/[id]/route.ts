import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';
import { requireUser } from '@/lib/auth-server';
import { ADMIN_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

const VALID_USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER', 'SECRETARY', 'BURSAR', 'PARENT'];
const HEADTEACHER_MANAGEABLE_ROLES = ['TEACHER', 'DOS', 'SECRETARY', 'BURSAR'];

// Helper to select user fields without password
const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  gender: true,
  address: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      students: true,
    },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] });

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const assignedClasses = await db.schoolClass.findMany({
      where: { teacherId: id },
      select: { id: true, name: true, stream: true },
      orderBy: [{ name: 'asc' }, { stream: 'asc' }],
    });

    return NextResponse.json({ success: true, data: { ...user, assignedClasses } });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return apiRouteError(error, 'Internal server error');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] });

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phone, role, gender, status, assignedClassId } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (email && email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    if (role && !VALID_USER_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }
    const nextRole = role || existing.role;
    if (authed.role === 'HEADTEACHER' && !HEADTEACHER_MANAGEABLE_ROLES.includes(existing.role)) {
      return NextResponse.json(
        { success: false, error: 'Headteacher can only manage teachers, DOS, secretary, and bursar accounts.' },
        { status: 403 }
      );
    }
    if (authed.role === 'HEADTEACHER' && !HEADTEACHER_MANAGEABLE_ROLES.includes(nextRole)) {
      return NextResponse.json(
        { success: false, error: 'Headteacher cannot assign this role.' },
        { status: 403 }
      );
    }
    if (nextRole === 'TEACHER' && existing.role !== 'TEACHER' && assignedClassId === undefined) {
      return NextResponse.json(
        { success: false, error: 'Teacher must be assigned to a class' },
        { status: 400 }
      );
    }
    if (assignedClassId) {
      const targetClass = await db.schoolClass.findUnique({ where: { id: assignedClassId } });
      if (!targetClass) {
        return NextResponse.json(
          { success: false, error: 'Assigned class not found' },
          { status: 404 }
        );
      }
      if (targetClass.teacherId && targetClass.teacherId !== id) {
        return NextResponse.json(
          { success: false, error: 'Assigned class already has a different teacher' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password) updateData.password = hashSync(password, 10);
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (gender !== undefined) updateData.gender = gender || null;
    if (status !== undefined) updateData.status = status;

    const user = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        select: userSelect,
      });

      if (existing.role === 'TEACHER' && nextRole !== 'TEACHER') {
        await tx.schoolClass.updateMany({
          where: { teacherId: id },
          data: { teacherId: null },
        });
      }

      if (nextRole === 'TEACHER' && assignedClassId !== undefined) {
        await tx.schoolClass.updateMany({
          where: { teacherId: id, id: { not: assignedClassId } },
          data: { teacherId: null },
        });
        await tx.schoolClass.update({
          where: { id: assignedClassId },
          data: { teacherId: id },
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: unknown) {
    console.error('Update user error:', error);
    return apiRouteError(error, 'Internal server error');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES] });

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete: set status to INACTIVE
    const user = await db.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: userSelect,
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User deactivated successfully',
    });
  } catch (error: unknown) {
    console.error('Delete user error:', error);
    return apiRouteError(error, 'Internal server error');
  }
}
