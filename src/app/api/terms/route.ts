import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const terms = await db.term.findMany({
      include: {
        _count: {
          select: {
            exams: true,
            feeStructures: true,
            attendances: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { name: 'desc' }],
    });

    return NextResponse.json({ success: true, data: terms });
  } catch (error: any) {
    console.error('Error fetching terms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch terms' },
      { status: 500 }
    );
  }
}
