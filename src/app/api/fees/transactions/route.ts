import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const studentId = searchParams.get('studentId');
    const classId = searchParams.get('classId');
    const term = searchParams.get('term');
    const status = searchParams.get('status');

    const where: Prisma.FeeTransactionWhereInput = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.student = { classId };
    if (term) where.term = term;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      db.feeTransaction.findMany({
        where,
        include: {
          student: {
            include: { class: true },
          },
          feeStructure: {
            include: { term: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.feeTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching fee transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      feeStructureId,
      amount,
      paymentMethod,
      transactionRef,
      term,
      notes,
    } = body;

    if (!studentId || !feeStructureId || !amount || !term) {
      return NextResponse.json(
        { success: false, error: 'Student, fee structure, amount, and term are required' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptPrefix = 'RCT';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const receiptNumber = `${receiptPrefix}-${dateStr}-${random}`;

    // Check uniqueness and retry if needed
    let finalReceiptNumber = receiptNumber;
    let existing = await db.feeTransaction.findUnique({
      where: { receiptNumber: finalReceiptNumber },
    });
    let attempts = 0;
    while (existing && attempts < 10) {
      const newRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      finalReceiptNumber = `${receiptPrefix}-${dateStr}-${newRandom}`;
      existing = await db.feeTransaction.findUnique({
        where: { receiptNumber: finalReceiptNumber },
      });
      attempts++;
    }

    const transaction = await db.feeTransaction.create({
      data: {
        studentId,
        feeStructureId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'CASH',
        transactionRef,
        receiptNumber: finalReceiptNumber,
        term,
        notes,
      },
      include: {
        student: {
          include: { class: true },
        },
        feeStructure: true,
      },
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating fee transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
