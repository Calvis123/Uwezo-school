import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total, counts] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
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
        },
      }),
      db.user.count({ where }),
      db.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    const activeCount = await db.user.count({ where: { status: 'ACTIVE' } });
    const staffCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
      },
    });
    const teacherCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: 'TEACHER',
      },
    });

    const roleCounts: Record<string, number> = {};
    counts.forEach((c) => {
      roleCounts[c.role] = c._count.id;
    });

    return NextResponse.json({
      success: true,
      data: {
        items: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        counts: {
          total,
          active: activeCount,
          staff: staffCount,
          teachers: teacherCount,
          byRole: roleCounts,
        },
      },
    });
  } catch (error: any) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, role, gender, status } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: role || 'TEACHER',
        gender: gender || null,
        status: status || 'ACTIVE',
      },
      select: {
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
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
