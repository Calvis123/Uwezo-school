import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
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

    // Get all fee structures applicable to this student's class
    const feeStructures = await db.feeStructure.findMany({
      where: { classId: student.classId },
      include: { term: true },
    });

    // Get all payments for this student
    const payments = await db.feeTransaction.findMany({
      where: { studentId },
      include: { feeStructure: true },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate totals
    const totalFees = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = totalFees - totalPaid;

    // Group payments by term
    const paymentsByTerm: Record<string, typeof payments> = {};
    for (const payment of payments) {
      const termKey = payment.term;
      if (!paymentsByTerm[termKey]) {
        paymentsByTerm[termKey] = [];
      }
      paymentsByTerm[termKey].push(payment);
    }

    // Group fee structures by term
    const structuresByTerm: Record<string, typeof feeStructures> = {};
    for (const structure of feeStructures) {
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
        feeStructures,
        payments,
        totalFees,
        totalPaid,
        balance,
        paymentsByTerm,
        structuresByTerm,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fee ledger:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee ledger' },
      { status: 500 }
    );
  }
}
