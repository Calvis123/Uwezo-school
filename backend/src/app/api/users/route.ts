import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { ADMIN_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

const VALID_USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER', 'SECRETARY', 'BURSAR', 'PARENT'];
const HEADTEACHER_CREATABLE_ROLES = ['TEACHER', 'DOS', 'SECRETARY', 'BURSAR'];

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role') || '';
    const excludeRole = searchParams.get('excludeRole') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    } else if (excludeRole) {
      where.role = { not: excludeRole };
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

    const userIds = users.map((u) => u.id);
    const classAssignments = userIds.length
      ? await db.schoolClass.findMany({
          where: { teacherId: { in: userIds } },
          select: { id: true, name: true, stream: true, teacherId: true },
          orderBy: [{ name: 'asc' }, { stream: 'asc' }],
        })
      : [];
    const assignedByTeacher = classAssignments.reduce<Record<string, { id: string; name: string; stream: string | null }[]>>((acc, cls) => {
      if (!cls.teacherId) return acc;
      if (!acc[cls.teacherId]) acc[cls.teacherId] = [];
      acc[cls.teacherId].push({ id: cls.id, name: cls.name, stream: cls.stream });
      return acc;
    }, {});

    const activeCount = await db.user.count({ where: { status: 'ACTIVE' } });
    const staffCount = await db.user.count({
      where: {
        status: 'ACTIVE',
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR'] },
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
        items: users.map((u) => ({ ...u, assignedClasses: assignedByTeacher[u.id] || [] })),
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
  } catch (error: unknown) {
    console.error('Users list error:', error);
    return apiRouteError(error, 'Internal server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] });

    const body = await request.json();
    const { name, email, password, phone, role, gender, status, assignedClassId } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (role && !VALID_USER_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }
    const nextRole = role || 'TEACHER';
    if (authed.role === 'HEADTEACHER' && !HEADTEACHER_CREATABLE_ROLES.includes(nextRole)) {
      return NextResponse.json(
        { success: false, error: 'Headteacher can only create TEACHER, DOS, SECRETARY, or BURSAR users' },
        { status: 403 }
      );
    }
    if (nextRole === 'TEACHER' && !assignedClassId) {
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
      if (targetClass.teacherId) {
        return NextResponse.json(
          { success: false, error: 'Assigned class already has a teacher' },
          { status: 409 }
        );
      }
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 10);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          role: nextRole,
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

      if (nextRole === 'TEACHER' && assignedClassId) {
        await tx.schoolClass.update({
          where: { id: assignedClassId },
          data: { teacherId: created.id },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    return apiRouteError(error, 'Internal server error');
  }
}
