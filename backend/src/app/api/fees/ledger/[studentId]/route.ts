import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { FINANCE_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { summarizeStudentFeeLedger } from '@/lib/fee-balance';

const FEE_READ_ROLES = [...FINANCE_ROLES, 'SECRETARY'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    await requireUser(request, { roles: [...FEE_READ_ROLES] });

    const { studentId } = await params;

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        busAssignments: {
          where: { status: 'ACTIVE' },
          select: {
            termId: true,
            transportMode: true,
            bus: { select: { routeName: true } },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true, startDate: true, endDate: true, status: true },
    });

    const terms = await db.term.findMany({
      select: { id: true, name: true, year: true, startDate: true, endDate: true, status: true },
      orderBy: [{ year: 'asc' }, { startDate: 'asc' }],
    });

    const feeStructures = await db.feeStructure.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: { term: true },
    });

    const payments = await db.feeTransaction.findMany({
      where: { studentId },
      include: { feeStructure: true },
      orderBy: { createdAt: 'asc' },
    });
    const ledger = summarizeStudentFeeLedger(
      terms,
      activeTerm?.id,
      feeStructures,
      payments,
      student
    );
    const currentTermSummary = ledger.termBreakdown.find((term) => term.termId === activeTerm?.id) || null;
    const applicableFeeStructures = currentTermSummary?.feeStructures || [];
    const applicablePayments = currentTermSummary?.payments || [];

    // Group payments by term
    const paymentsByTerm: Record<string, typeof payments> = {};
    for (const payment of applicablePayments) {
      const termKey = payment.term;
      if (!paymentsByTerm[termKey]) {
        paymentsByTerm[termKey] = [];
      }
      paymentsByTerm[termKey].push(payment);
    }

    // Group fee structures by term
    const structuresByTerm: Record<string, typeof feeStructures> = {};
    for (const structure of applicableFeeStructures) {
      const termKey = `${structure.term.year}-${structure.term.name}`;
      if (!structuresByTerm[termKey]) {
        structuresByTerm[termKey] = [];
      }
      structuresByTerm[termKey].push(structure);
    }

    return NextResponse.json({
      success: true,
      data: {
        student,
        term: activeTerm,
        feeStructures: applicableFeeStructures,
        payments: applicablePayments,
        totalFees: ledger.totalFees,
        totalPaid: ledger.totalPaid,
        balance: ledger.balance,
        currentTerm: ledger.current,
        arrears: ledger.arrears,
        termBreakdown: ledger.termBreakdown.map((term) => ({
          termId: term.termId,
          termName: term.termName,
          year: term.year,
          label: term.label,
          totalFees: term.totalFees,
          totalPaid: term.totalPaid,
          balance: term.balance,
        })),
        paymentsByTerm,
        structuresByTerm,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching fee ledger:', error);
    return apiRouteError(error, 'Failed to fetch fee ledger');
  }
}
