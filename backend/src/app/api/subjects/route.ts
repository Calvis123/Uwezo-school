import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const where: Prisma.SubjectWhereInput = {};
    if (level) where.level = level;

    const subjects = await db.subject.findMany({
      where,
      include: {
        _count: {
          select: { examMarks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: subjects });
  } catch (error: unknown) {
    console.error('Error fetching subjects:', error);
    return apiRouteError(error, 'Failed to fetch subjects');
  }
}
