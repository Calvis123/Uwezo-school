import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    const studentId = searchParams.get('studentId');
    const termId = searchParams.get('termId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50')));

    const where: Prisma.AttendanceWhereInput = {};

    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (termId) where.termId = termId;

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    const [records, total] = await Promise.all([
      db.attendance.findMany({
        where,
        include: {
          student: {
            include: { class: true },
          },
          class: true,
          term: true,
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.attendance.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}
