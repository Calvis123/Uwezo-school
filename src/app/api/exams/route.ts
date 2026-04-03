import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Prisma.ExamWhereInput = {};
    if (classId) where.classId = classId;
    if (termId) where.termId = termId;
    if (status) where.status = status;
    if (type) where.type = type;

    const exams = await db.exam.findMany({
      where,
      include: {
        class: true,
        term: true,
        _count: {
          select: { marks: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error: any) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, termId, classId, type, startDate, endDate, totalMarks } = body;

    if (!name || !termId || !classId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Name, term, class, start date, and end date are required' },
        { status: 400 }
      );
    }

    const exam = await db.exam.create({
      data: {
        name,
        termId,
        classId,
        type: type || 'END_TERM',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalMarks: totalMarks || 100,
      },
      include: {
        class: true,
        term: true,
      },
    });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}
