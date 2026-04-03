import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    // Get active term if not specified
    let activeTermId = termId;
    if (!activeTermId) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
      });
      activeTermId = activeTerm?.id || '';
    }

    // Total expected fees
    const feeStructures = await db.feeStructure.findMany({
      where: activeTermId ? { termId: activeTermId } : undefined,
      include: {
        class: {
          include: {
            students: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    let totalExpected = 0;
    for (const fs of feeStructures) {
      totalExpected += fs.amount * fs.class.students.length;
    }

    // Total collected
    const transactions = await db.feeTransaction.findMany({
      where: {
        status: 'COMPLETED',
        ...(activeTermId ? { feeStructure: { termId: activeTermId } } : {}),
      },
    });

    const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Students with outstanding balances
    const activeStudents = await db.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        class: true,
        feeTransactions: {
          where: {
            status: 'COMPLETED',
            ...(activeTermId ? { feeStructure: { termId: activeTermId } } : {}),
          },
        },
      },
    });

    const studentFees = await db.feeStructure.findMany({
      where: activeTermId ? { termId: activeTermId } : undefined,
    });

    // Build a map of classId -> total fee for that class
    const classFeesMap: Record<string, number> = {};
    for (const fs of studentFees) {
      if (!classFeesMap[fs.classId]) classFeesMap[fs.classId] = 0;
      classFeesMap[fs.classId] += fs.amount;
    }

    let totalOutstanding = 0;
    let fullyPaidCount = 0;
    let partialPaidCount = 0;
    let unpaidCount = 0;

    for (const student of activeStudents) {
      const expected = classFeesMap[student.classId] || 0;
      const paid = student.feeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = expected - paid;

      if (balance <= 0) {
        fullyPaidCount++;
      } else if (paid > 0) {
        partialPaidCount++;
        totalOutstanding += balance;
      } else {
        unpaidCount++;
        totalOutstanding += balance;
      }
    }

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    // Payment method breakdown
    const paymentByMethod: Record<string, number> = {};
    for (const t of transactions) {
      if (!paymentByMethod[t.paymentMethod]) paymentByMethod[t.paymentMethod] = 0;
      paymentByMethod[t.paymentMethod] += t.amount;
    }

    // Recent payments (last 10)
    const recentPayments = await db.feeTransaction.findMany({
      where: { status: 'COMPLETED' },
      include: {
        student: {
          include: { class: true },
        },
        feeStructure: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalCollected,
        totalExpected,
        totalOutstanding,
        collectionRate: Math.round(collectionRate * 100) / 100,
        studentSummary: {
          totalStudents: activeStudents.length,
          fullyPaid: fullyPaidCount,
          partialPaid: partialPaidCount,
          unpaid: unpaidCount,
        },
        paymentByMethod,
        recentPayments,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fee stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee statistics' },
      { status: 500 }
    );
  }
}
