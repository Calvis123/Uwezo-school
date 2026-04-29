import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { getParentPrimaryStudentId } from '@/lib/parent-access';
import { ALL_CLASSES_MARKER } from '@/lib/fee-structure-scope';
import { summarizeStudentFeeBalance } from '@/lib/fee-balance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const guardian = await requireUser(request, { roles: ['PARENT'] });
    const { studentId } = await params;

    const primaryStudentId = await getParentPrimaryStudentId(guardian.id);
    if (!primaryStudentId || primaryStudentId !== studentId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

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
      select: { id: true, name: true, year: true, status: true },
    });

    // Get all fee structures for the student's class
    const feeStructures = await db.feeStructure.findMany({
      where: {
        OR: [
          { classId: student.classId },
          { description: { startsWith: ALL_CLASSES_MARKER } },
        ],
        ...(activeTerm ? { termId: activeTerm.id } : {}),
      },
      include: { term: true },
      orderBy: [{ term: { year: 'asc' } }, { term: { name: 'asc' } }],
    });

    // Get all payments for this student
    const payments = await db.feeTransaction.findMany({
      where: {
        studentId,
        ...(activeTerm
          ? {
              feeStructure: {
                termId: activeTerm.id,
              },
            }
          : {}),
      },
      include: { feeStructure: { include: { term: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const {
      applicableFeeStructures,
      applicablePayments,
      totalFees,
      totalPaid,
      balance,
    } = summarizeStudentFeeBalance(feeStructures, payments, student);

    const nonTransportStructures = applicableFeeStructures.filter((structure) => structure.category !== 'TRANSPORT');
    const transportStructures = applicableFeeStructures.filter((structure) => structure.category === 'TRANSPORT');
    const nonTransportIds = new Set(nonTransportStructures.map((structure) => structure.id));
    const transportIds = new Set(transportStructures.map((structure) => structure.id));

    const tuitionPaid = applicablePayments
      .filter((payment) => payment.status === 'COMPLETED' && nonTransportIds.has(payment.feeStructureId))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const transportPaid = applicablePayments
      .filter((payment) => payment.status === 'COMPLETED' && transportIds.has(payment.feeStructureId))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const tuitionTotal = nonTransportStructures.reduce((sum, structure) => sum + structure.amount, 0);
    const transportTotal = transportStructures.reduce((sum, structure) => sum + structure.amount, 0);
    const tuitionBalance = Math.max(0, tuitionTotal - tuitionPaid);
    const transportBalance = Math.max(0, transportTotal - transportPaid);

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

    for (const fs of applicableFeeStructures) {
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

    for (const p of applicablePayments) {
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
          balance: Math.max(0, termFees - termPaid),
          categorySummary: {
            tuition: {
              totalFees: term.structures
                .filter((fs) => fs.category !== 'TRANSPORT')
                .reduce((sum, fs) => sum + fs.amount, 0),
              totalPaid: term.payments
                .filter((p) => p.status === 'COMPLETED' && p.feeStructure?.category !== 'TRANSPORT')
                .reduce((sum, p) => sum + p.amount, 0),
            },
            transport: {
              applicable: student.studentType === 'DAY' && !!student.usesTransport,
              totalFees: term.structures
                .filter((fs) => fs.category === 'TRANSPORT')
                .reduce((sum, fs) => sum + fs.amount, 0),
              totalPaid: term.payments
                .filter((p) => p.status === 'COMPLETED' && p.feeStructure?.category === 'TRANSPORT')
                .reduce((sum, p) => sum + p.amount, 0),
            },
          },
          structures: term.structures.map((fs) => ({
            id: fs.id,
            name: fs.name,
            category: fs.category,
            amount: fs.amount,
          })),
          payments: term.payments.map((p) => ({
            id: p.id,
            feeStructureId: p.feeStructureId,
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
    const recentPayments = applicablePayments.slice(0, 10).map((p) => ({
      id: p.id,
      feeStructureId: p.feeStructureId,
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
          studentType: student.studentType,
          usesTransport: !!student.usesTransport,
          class: student.class
            ? { id: student.class.id, name: student.class.name }
            : null,
        },
        activeTerm: activeTerm
          ? { id: activeTerm.id, name: activeTerm.name, year: activeTerm.year, status: activeTerm.status }
          : null,
        totalFees,
        totalPaid,
        balance: Math.max(0, balance),
        categorySummary: {
          tuition: {
            totalFees: tuitionTotal,
            totalPaid: tuitionPaid,
            balance: tuitionBalance,
          },
          transport: {
            applicable: student.studentType === 'DAY' && !!student.usesTransport,
            totalFees: transportTotal,
            totalPaid: transportPaid,
            balance: transportBalance,
          },
        },
        termBreakdown,
        recentPayments,
        paymentCount: applicablePayments.length,
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
