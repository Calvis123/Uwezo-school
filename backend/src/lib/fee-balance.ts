import {
  feeClassScopeAppliesToClass,
  getClassScopeFromDescription,
  getFeeClassScopeForClass,
  getTransportRouteFromDescription,
  isAllClassesScopeDescription,
  transportRouteAppliesToStudent,
} from '@/lib/fee-structure-scope';

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
  feeStructure?: {
    termId?: string | null;
  } | null;
};

type TermLike = {
  id: string;
  name: string;
  year: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: string | null;
};

function getTransportFeeMultiplier(transportMode?: string | null) {
  return String(transportMode || '').startsWith('ONE_WAY') ? 0.5 : 1;
}

export function getApplicableFeeStructures<T extends FeeStructureLike>(
  feeStructures: T[],
  student: {
    classId: string;
    class?: { name?: string | null; level?: string | null } | null;
    studentType?: 'DAY' | 'BOARDING' | string | null;
    usesTransport?: boolean | null;
    transportRouteName?: string | null;
    transportMode?: string | null;
  }
) {
  const studentScope = getFeeClassScopeForClass(student.class);

  return feeStructures.filter((structure) => {
    const classScope = getClassScopeFromDescription(structure.description);
    const feeRouteName = getTransportRouteFromDescription(structure.description);
    const appliesByTransportRoute = structure.category === 'TRANSPORT' && Boolean(feeRouteName);
    const appliesToStudentClass =
      structure.classId === student.classId ||
      isAllClassesScopeDescription(structure.description) ||
      feeClassScopeAppliesToClass(classScope, studentScope) ||
      appliesByTransportRoute;

    if (!appliesToStudentClass) return false;
    if (structure.category === 'BOARDING' && student.studentType !== 'BOARDING') return false;
    if (structure.category === 'TUITION' && student.studentType === 'BOARDING') return false;
    if (structure.category === 'TRANSPORT') {
      if (student.studentType && student.studentType !== 'DAY') return false;
      if (!student.usesTransport) return false;
      if (!transportRouteAppliesToStudent(feeRouteName, student.transportRouteName, student.transportMode)) return false;
    }
    return true;
  }).map((structure) => {
    if (structure.category !== 'TRANSPORT') return structure;
    return {
      ...structure,
      amount: Number(structure.amount || 0) * getTransportFeeMultiplier(student.transportMode),
    };
  });
}

export function summarizeStudentFeeBalance<TStructure extends FeeStructureLike, TPayment extends PaymentLike>(
  feeStructures: TStructure[],
  payments: TPayment[],
  student: {
    classId: string;
    class?: { name?: string | null; level?: string | null } | null;
    studentType?: 'DAY' | 'BOARDING' | string | null;
    usesTransport?: boolean | null;
    transportRouteName?: string | null;
    transportMode?: string | null;
  }
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

function getTermNumber(termName: string) {
  return Number(termName.match(/\d+/)?.[0] || '99');
}

function termTime(term: TermLike) {
  if (term.startDate) return new Date(term.startDate).getTime();
  return term.year * 100 + getTermNumber(term.name);
}

export function sortTermsChronologically<T extends TermLike>(terms: T[]) {
  return [...terms].sort((a, b) => {
    const byTime = termTime(a) - termTime(b);
    if (byTime !== 0) return byTime;
    if (a.year !== b.year) return a.year - b.year;
    return getTermNumber(a.name) - getTermNumber(b.name);
  });
}

export function summarizeStudentFeesByTerm<
  TTerm extends TermLike,
  TStructure extends FeeStructureLike & { termId: string },
  TPayment extends PaymentLike
>(
  terms: TTerm[],
  feeStructures: TStructure[],
  payments: TPayment[],
  student: {
    classId: string;
    class?: { name?: string | null; level?: string | null } | null;
    studentType?: 'DAY' | 'BOARDING' | string | null;
    usesTransport?: boolean | null;
    busAssignments?: Array<{
      termId: string;
      transportMode?: string | null;
      bus?: { routeName?: string | null } | null;
    }> | null;
  }
) {
  return sortTermsChronologically(terms).map((term) => {
    const assignment = student.busAssignments?.find((item) => item.termId === term.id);
    const applicableFeeStructures = getApplicableFeeStructures(
      feeStructures.filter((structure) => structure.termId === term.id),
      {
        ...student,
        transportRouteName: assignment?.bus?.routeName || null,
        transportMode: assignment?.transportMode || null,
      }
    );
    const applicableStructureIds = new Set(applicableFeeStructures.map((structure) => structure.id));
    const applicablePayments = payments.filter((payment) => {
      const paymentTermId = payment.feeStructure?.termId;
      return applicableStructureIds.has(payment.feeStructureId) && (!paymentTermId || paymentTermId === term.id);
    });
    const totalFees = applicableFeeStructures.reduce((sum, structure) => sum + Number(structure.amount || 0), 0);
    const totalPaid = applicablePayments
      .filter((payment) => !payment.status || payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      termId: term.id,
      termName: term.name,
      year: term.year,
      label: `${term.name} ${term.year}`,
      totalFees,
      totalPaid,
      balance: Math.max(0, totalFees - totalPaid),
      feeStructures: applicableFeeStructures,
      payments: applicablePayments,
    };
  });
}

export function summarizeStudentFeeLedger<
  TTerm extends TermLike,
  TStructure extends FeeStructureLike & { termId: string },
  TPayment extends PaymentLike
>(
  terms: TTerm[],
  currentTermId: string | null | undefined,
  feeStructures: TStructure[],
  payments: TPayment[],
  student: Parameters<typeof summarizeStudentFeesByTerm<TTerm, TStructure, TPayment>>[3]
) {
  const termBreakdown = summarizeStudentFeesByTerm(terms, feeStructures, payments, student);
  const currentIndex = currentTermId
    ? termBreakdown.findIndex((term) => term.termId === currentTermId)
    : termBreakdown.length - 1;
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : termBreakdown.length - 1;
  const currentTerm = safeCurrentIndex >= 0 ? termBreakdown[safeCurrentIndex] : null;
  const arrearsTerms = safeCurrentIndex >= 0
    ? termBreakdown.slice(0, safeCurrentIndex).filter((term) => term.balance > 0)
    : [];
  const arrears = arrearsTerms.reduce(
    (acc, term) => {
      acc.totalFees += term.totalFees;
      acc.totalPaid += term.totalPaid;
      acc.balance += term.balance;
      return acc;
    },
    { totalFees: 0, totalPaid: 0, balance: 0 }
  );

  const current = currentTerm
    ? {
        totalFees: currentTerm.totalFees,
        totalPaid: currentTerm.totalPaid,
        balance: currentTerm.balance,
        termId: currentTerm.termId,
        termName: currentTerm.termName,
        year: currentTerm.year,
      }
    : { totalFees: 0, totalPaid: 0, balance: 0, termId: null, termName: null, year: null };

  return {
    termBreakdown,
    current,
    arrears: {
      ...arrears,
      terms: arrearsTerms,
    },
    totalFees: current.totalFees + arrears.balance,
    totalPaid: current.totalPaid,
    balance: current.balance + arrears.balance,
  };
}
