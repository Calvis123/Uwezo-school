import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    const where: Prisma.SchoolClassWhereInput = {};
    if (level) where.level = level;

    const classes = await db.schoolClass.findMany({
      where,
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const classesWithCount = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      stream: cls.stream,
      teacherId: cls.teacherId,
      capacity: cls.capacity,
      studentCount: cls._count.students,
    }));

    return NextResponse.json({ success: true, data: classesWithCount });
  } catch (error: any) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}
