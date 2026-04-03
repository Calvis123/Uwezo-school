import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const role = searchParams.get('role');

    const notices = await db.schoolNotice.findMany({
      where: {
        isPublished: true,
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: 'desc' },
    });

    // Filter by role if specified
    let filteredNotices = notices;
    if (role) {
      filteredNotices = notices.filter(
        (n) => n.targetRoles === 'ALL' || n.targetRoles.includes(role.toUpperCase())
      );
    }

    // Filter out expired notices
    const now = new Date();
    const activeNotices = filteredNotices.filter(
      (n) => !n.expiresAt || n.expiresAt > now
    );

    return NextResponse.json({ success: true, data: activeNotices });
  } catch (error: any) {
    console.error('Error fetching notices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notices' },
      { status: 500 }
    );
  }
}
