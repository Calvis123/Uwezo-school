import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { ALL_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

const NOTICE_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY'] as const;

function canUserViewNotice(targetRoles: string, userRole: string): boolean {
  const normalizedRole = userRole.toUpperCase();
  const targets = (targetRoles || 'ALL')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (targets.includes('ALL')) return true;
  if (targets.includes(normalizedRole)) return true;
  if (targets.includes('STAFF') && normalizedRole !== 'PARENT') return true;
  if (targets.includes('PARENT') && normalizedRole === 'PARENT') return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const canManage = NOTICE_MANAGER_ROLES.includes(user.role as any);

    const where: Prisma.SchoolNoticeWhereInput = {
      ...(includeDrafts && canManage ? {} : { isPublished: true }),
      ...(category ? { category } : {}),
    };

    const notices = await db.schoolNotice.findMany({
      where,
      orderBy: [{ isPublished: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const role = user.role.toUpperCase();
    const filteredNotices = notices.filter((n) => canUserViewNotice(n.targetRoles, role));

    return NextResponse.json({ success: true, data: filteredNotices });
  } catch (error: unknown) {
    console.error('Error fetching notices:', error);
    return apiRouteError(error, 'Failed to fetch notices');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...NOTICE_MANAGER_ROLES] });
    const body = await request.json().catch(() => null);

    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const category = String(body?.category || 'GENERAL').trim().toUpperCase();
    const targetRoles = String(body?.targetRoles || 'ALL').trim().toUpperCase();
    const isPublished = Boolean(body?.isPublished);
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const notice = await db.schoolNotice.create({
      data: {
        title,
        content,
        category,
        targetRoles,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, data: notice });
  } catch (error: unknown) {
    console.error('Error creating notice:', error);
    return apiRouteError(error, 'Failed to create notice');
  }
}
