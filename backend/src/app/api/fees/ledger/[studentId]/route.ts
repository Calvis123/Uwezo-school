import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { FINANCE_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { ALL_CLASSES_MARKER } from '@/lib/fee-structure-scope';

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
      include: { class: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true },
    });

    // Get current-term fee structures applicable to this student's class
    const feeStructures = await db.feeStructure.findMany({
      where: {
        OR: [
          { classId: student.classId },
          { description: { startsWith: ALL_CLASSES_MARKER } },
        ],
        ...(activeTerm ? { termId: activeTerm.id } : {}),
      },
      include: { term: true },
    });
    const applicableFeeStructures = feeStructures.filter(
      (structure) => structure.category !== 'TRANSPORT' || student.usesTransport
    );

    // Get payments for this student (filtered to current-term structures below)
    const payments = await db.feeTransaction.findMany({
      where: { studentId },
      include: { feeStructure: true },
      orderBy: { createdAt: 'asc' },
    });
    const applicableStructureIds = new Set(applicableFeeStructures.map((structure) => structure.id));
    const applicablePayments = payments.filter((payment) => applicableStructureIds.has(payment.feeStructureId));

    // Calculate totals
    const totalFees = applicableFeeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const totalPaid = applicablePayments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = totalFees - totalPaid;

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
        totalFees,
        totalPaid,
        balance,
        paymentsByTerm,
        structuresByTerm,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching fee ledger:', error);
    return apiRouteError(error, 'Failed to fetch fee ledger');
  }
}
