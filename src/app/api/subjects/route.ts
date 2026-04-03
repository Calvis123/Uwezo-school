import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
