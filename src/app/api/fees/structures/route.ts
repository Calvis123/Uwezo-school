import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Prisma.FeeStructureWhereInput = {};
    if (classId) where.classId = classId;
    if (termId) where.termId = termId;
    if (category) where.category = category;

    // If no term filter, default to the current active term
    if (!termId) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
      });
      if (activeTerm) {
        where.termId = activeTerm.id;
      }
    }

    const [structures, total] = await Promise.all([
      db.feeStructure.findMany({
        where,
        include: {
          class: true,
          term: true,
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.feeStructure.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: structures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching fee structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee structures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, classId, termId, amount, category, description } = body;

    if (!name || !classId || !termId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Name, class, term, and amount are required' },
        { status: 400 }
      );
    }

    const structure = await db.feeStructure.create({
      data: {
        name,
        classId,
        termId,
        amount: parseFloat(amount),
        category: category || 'TUITION',
        description,
      },
      include: {
        class: true,
        term: true,
      },
    });

    return NextResponse.json({ success: true, data: structure }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating fee structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create fee structure' },
      { status: 500 }
    );
  }
}
