import { isAllClassesScopeDescription } from '@/lib/fee-structure-scope';

type FeeStructureLike = {
  id: string;
  classId: string;
  amount: number;
  category: string;
  description?: string | null;
};

type PaymentLike = {
  feeStructureId: string;
  amount: number;
  status?: string | null;
};

export function getApplicableFeeStructures(
  feeStructures: FeeStructureLike[],
  student: { classId: string; studentType?: 'DAY' | 'BOARDING' | null; usesTransport?: boolean | null }
) {
  return feeStructures.filter((structure) => {
    const appliesToStudentClass =
      structure.classId === student.classId ||
      isAllClassesScopeDescription(structure.description);

    if (!appliesToStudentClass) return false;
    if (structure.category === 'BOARDING' && student.studentType !== 'BOARDING') return false;
    if (structure.category === 'TUITION' && student.studentType === 'BOARDING') return false;
    if (structure.category === 'TRANSPORT' && !student.usesTransport) return false;
    return true;
  });
}

export function summarizeStudentFeeBalance(
  feeStructures: FeeStructureLike[],
  payments: PaymentLike[],
  student: { classId: string; studentType?: 'DAY' | 'BOARDING' | null; usesTransport?: boolean | null }
) {
  const applicableFeeStructures = getApplicableFeeStructures(feeStructures, student);
  const applicableStructureIds = new Set(applicableFeeStructures.map((structure) => structure.id));
  const applicablePayments = payments.filter((payment) => applicableStructureIds.has(payment.feeStructureId));

  const totalFees = applicableFeeStructures.reduce((sum, structure) => sum + Number(structure.amount || 0), 0);
  const totalPaid = applicablePayments
    .filter((payment) => !payment.status || payment.status === 'COMPLETED')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return {
    applicableFeeStructures,
    applicablePayments,
    totalFees,
    totalPaid,
    balance: Math.max(0, totalFees - totalPaid),
  };
}
