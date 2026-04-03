import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';

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

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phone, role, gender, status } = body;

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

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password) updateData.password = hashSync(password, 10);
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined) updateData.role = role;
    if (gender !== undefined) updateData.gender = gender || null;
    if (status !== undefined) updateData.status = status;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
