import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { FINANCE_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { isAllClassesScopeDescription } from '@/lib/fee-structure-scope';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] });

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

    // Total collected
    const transactions = await db.feeTransaction.findMany({
      where: {
        status: 'COMPLETED',
        ...(activeTermId ? { feeStructure: { termId: activeTermId } } : {}),
      },
    });

    const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0);

    const studentFees = await db.feeStructure.findMany({
      where: activeTermId ? { termId: activeTermId } : undefined,
      select: {
        classId: true,
        amount: true,
        category: true,
        description: true,
      },
    });

    // Students with outstanding balances + expected calculation inputs
    const activeStudents = await db.student.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        classId: true,
        usesTransport: true,
        feeTransactions: {
          where: {
            status: 'COMPLETED',
            ...(activeTermId ? { feeStructure: { termId: activeTermId } } : {}),
          },
          select: {
            amount: true,
          },
        },
      },
    });

    // Build maps of classId -> total fee for each category type
    const classBaseFeesMap: Record<string, number> = {};
    const classTransportFeesMap: Record<string, number> = {};
    let globalBaseFees = 0;
    let globalTransportFees = 0;
    for (const fs of studentFees) {
      const appliesToAllClasses = isAllClassesScopeDescription(fs.description);
      if (fs.category === 'TRANSPORT') {
        if (appliesToAllClasses) {
          globalTransportFees += fs.amount;
        } else {
          if (!classTransportFeesMap[fs.classId]) classTransportFeesMap[fs.classId] = 0;
          classTransportFeesMap[fs.classId] += fs.amount;
        }
      } else {
        if (appliesToAllClasses) {
          globalBaseFees += fs.amount;
        } else {
          if (!classBaseFeesMap[fs.classId]) classBaseFeesMap[fs.classId] = 0;
          classBaseFeesMap[fs.classId] += fs.amount;
        }
      }
    }

    let totalExpected = 0;
    let totalOutstanding = 0;
    let fullyPaidCount = 0;
    let partialPaidCount = 0;
    let unpaidCount = 0;

    for (const student of activeStudents) {
      const expected =
        (classBaseFeesMap[student.classId] || 0) +
        globalBaseFees +
        (student.usesTransport ? (classTransportFeesMap[student.classId] || 0) + globalTransportFees : 0);
      const paid = student.feeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = expected - paid;
      totalExpected += expected;

      if (paid <= 0) {
        unpaidCount++;
        totalOutstanding += Math.max(0, balance);
      } else if (balance <= 0) {
        fullyPaidCount++;
      } else {
        partialPaidCount++;
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
  } catch (error: unknown) {
    console.error('Error fetching fee stats:', error);
    return apiRouteError(error, 'Failed to fetch fee statistics');
  }
}
