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

    // Get all fee structures for the student's class
    const feeStructures = await db.feeStructure.findMany({
      where: { classId: student.classId },
      include: { term: true },
      orderBy: [{ term: { year: 'asc' } }, { term: { name: 'asc' } }],
    });

    // Get all payments for this student
    const payments = await db.feeTransaction.findMany({
      where: { studentId },
      include: { feeStructure: { include: { term: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totalFees = feeStructures.reduce((sum, fs) => sum + fs.amount, 0);
    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    const balance = totalFees - totalPaid;

    // Build term-by-term breakdown
    const termMap = new Map<
      string,
      {
        termId: string;
        termName: string;
        year: number;
        structures: typeof feeStructures;
        payments: typeof payments;
      }
    >();

    for (const fs of feeStructures) {
      const key = fs.termId;
      if (!termMap.has(key)) {
        termMap.set(key, {
          termId: fs.term.id,
          termName: fs.term.name,
          year: fs.term.year,
          structures: [],
          payments: [],
        });
      }
      termMap.get(key)!.structures.push(fs);
    }

    for (const p of payments) {
      const termKey = p.feeStructure?.termId;
      if (termKey && termMap.has(termKey)) {
        termMap.get(termKey)!.payments.push(p);
      }
    }

    const termBreakdown = Array.from(termMap.values())
      .map((term) => {
        const termFees = term.structures.reduce((s, fs) => s + fs.amount, 0);
        const termPaid = term.payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((s, p) => s + p.amount, 0);

        return {
          termId: term.termId,
          termName: term.termName,
          year: term.year,
          label: `${term.year} ${term.termName}`,
          totalFees: termFees,
          totalPaid: termPaid,
          balance: termFees - termPaid,
          structures: term.structures.map((fs) => ({
            id: fs.id,
            name: fs.name,
            category: fs.category,
            amount: fs.amount,
          })),
          payments: term.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            paymentMethod: p.paymentMethod,
            receiptNumber: p.receiptNumber,
            status: p.status,
            date: p.createdAt,
            feeName: p.feeStructure?.name || 'N/A',
          })),
        };
      })
      .sort((a, b) => a.year - b.year || a.termName.localeCompare(b.termName));

    // Recent payments (last 10)
    const recentPayments = payments.slice(0, 10).map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      receiptNumber: p.receiptNumber,
      status: p.status,
      date: p.createdAt,
      feeName: p.feeStructure?.name || 'N/A',
    }));

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          class: student.class
            ? { id: student.class.id, name: student.class.name }
            : null,
        },
        totalFees,
        totalPaid,
        balance,
        termBreakdown,
        recentPayments,
        paymentCount: payments.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching parent fee ledger:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee ledger' },
      { status: 500 }
    );
  }
}
