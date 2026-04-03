import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const role = searchParams.get('role');

    const where: Prisma.SchoolNoticeWhereInput = {
      isPublished: true,
      ...(category ? { category } : {}),
    };

    const notices = await db.schoolNotice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Filter by role if specified
    let filteredNotices = notices;
    if (role) {
      filteredNotices = notices.filter(
        (n) => n.targetRoles === 'ALL' || n.targetRoles.includes(role.toUpperCase())
      );
    }

    return NextResponse.json({ success: true, data: filteredNotices });
  } catch (error: any) {
    console.error('Error fetching notices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notices' },
      { status: 500 }
    );
  }
}
