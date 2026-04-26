import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { buildStyledExportPdf } from '@/lib/export-pdf'

type FeeReportType =
  | 'transactions'
  | 'outstanding'
  | 'transport-paid-students'
  | 'fee-arrears-students'
  | 'summary'
  | 'statements'
  | 'management-summary'
  | 'total-collections'
  | 'monthly-income'
  | 'mpesa-summary'
  | 'bank-reconciliation'
  | 'expense-summary'
  | 'budget-report'
type ExportFormat = 'csv' | 'xls' | 'pdf'

type ExportHistoryEntry = {
  id: string
  category: 'FINANCE'
  reportType: FeeReportType
  format: ExportFormat
  userId: string
  userName: string
  role: string
  filters: {
    classId: string | null
    startDate: string | null
    endDate: string | null
  }
  rowCount: number
  createdAt: string
}

const EXPORT_HISTORY_KEY = 'export_history'

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function csvEscape(value: string | number) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: Array<Record<string, string | number>>, keys: string[]) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => keys.map((k) => csvEscape(row[k] ?? '')).join(',')),
  ]
  return lines.join('\n')
}

function toXlsHtml(headers: string[], rows: Array<Record<string, string | number>>, keys: string[]) {
  const escapeHtml = (v: string | number) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <table border="1">
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows
          .map((r) => `<tr>${keys.map((k) => `<td>${escapeHtml(r[k] ?? '')}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
  </body></html>`
}

async function toPdf(
  title: string,
  headers: string[],
  rows: Array<Record<string, string | number>>,
  keys: string[],
  stamp: string
) {
  return buildStyledExportPdf({
    title,
    headers,
    rows,
    keys,
    stamp,
    maxRows: 500,
  })
}

async function readExportHistory(): Promise<ExportHistoryEntry[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: EXPORT_HISTORY_KEY },
    select: { value: true },
  })
  if (!setting?.value) return []
  try {
    const parsed = JSON.parse(setting.value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeExportHistory(entries: ExportHistoryEntry[]) {
  await db.systemSetting.upsert({
    where: { key: EXPORT_HISTORY_KEY },
    update: { value: JSON.stringify(entries) },
    create: { key: EXPORT_HISTORY_KEY, value: JSON.stringify(entries) },
  })
}

async function logExport(entry: ExportHistoryEntry) {
  try {
    const existing = await readExportHistory()
    existing.unshift(entry)
    await writeExportHistory(existing.slice(0, 2000))
  } catch {
    // Logging should never block export.
  }
}

function canAccessFinanceReport(role: string, reportType: FeeReportType) {
  const normalizedRole = role.toUpperCase()
  if (normalizedRole === 'SECRETARY') {
    return reportType === 'statements'
  }
  if (normalizedRole === 'HEADTEACHER') {
    return [
      'summary',
      'outstanding',
      'transport-paid-students',
      'fee-arrears-students',
      'management-summary',
      'total-collections',
      'monthly-income',
      'mpesa-summary',
      'bank-reconciliation',
      'expense-summary',
      'budget-report',
    ].includes(reportType)
  }
  return true
}

function buildDateFilter(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return undefined
  const filter: { gte?: Date; lte?: Date } = {}
  if (startDate) filter.gte = new Date(startDate)
  if (endDate) filter.lte = new Date(`${endDate}T23:59:59.999Z`)
  return filter
}

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...FINANCE_ROLES, 'SECRETARY'] })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = (searchParams.get('format') || 'csv').toLowerCase() as ExportFormat
    const reportType = (searchParams.get('reportType') || 'transactions').toLowerCase() as FeeReportType

    if (
      ![
        'transactions',
        'outstanding',
        'transport-paid-students',
        'fee-arrears-students',
        'summary',
        'statements',
        'management-summary',
        'total-collections',
        'monthly-income',
        'mpesa-summary',
        'bank-reconciliation',
        'expense-summary',
        'budget-report',
      ].includes(reportType)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid reportType' }, { status: 400 })
    }
    if (!['csv', 'xls', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 })
    }
    if (!canAccessFinanceReport(authed.role, reportType)) {
      if (authed.role.toUpperCase() === 'SECRETARY') {
        return NextResponse.json(
          { success: false, error: 'Secretary can only export fee statements' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Headteacher can only export headteacher finance summaries, balances, and accounting reports' },
        { status: 403 }
      )
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const dateFilter = buildDateFilter(startDate, endDate)

    let headers: string[] = []
    let keys: string[] = []
    let rows: Array<Record<string, string | number>> = []
    let filename = `fees-export-${stamp}`
    let title = 'Finance Export'

    if (reportType === 'transactions') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where,
        include: {
          student: { include: { class: true } },
          feeStructure: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
      })

      let balancesByStudentId: Record<string, number> = {}
      if (activeTerm?.id && transactions.length > 0) {
        const uniqueStudents = new Map(
          transactions
            .filter((t) => t.student)
            .map((t) => [t.studentId, t.student as any])
        )
        const studentIds = Array.from(uniqueStudents.keys())
        const classIds = Array.from(new Set(Array.from(uniqueStudents.values()).map((s: any) => s.classId)))

        const [structures, payments] = await Promise.all([
          db.feeStructure.findMany({
            where: { termId: activeTerm.id, status: 'ACTIVE', classId: { in: classIds } },
            select: { classId: true, category: true, amount: true },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: { termId: activeTerm.id },
            },
            select: { studentId: true, amount: true },
          }),
        ])

        const classBaseTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category === 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const classTransportTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category !== 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const paidTotals = payments.reduce<Record<string, number>>((acc, p) => {
          acc[p.studentId] = (acc[p.studentId] || 0) + Number(p.amount || 0)
          return acc
        }, {})

        balancesByStudentId = Object.fromEntries(
          Array.from(uniqueStudents.values()).map((student: any) => {
            const expected = (classBaseTotals[student.classId] || 0) + (student.usesTransport ? classTransportTotals[student.classId] || 0 : 0)
            const paid = paidTotals[student.id] || 0
            return [student.id, Math.max(0, expected - paid)]
          })
        )
      }

      rows = transactions.map((t) => ({
        studentName: t.student ? `${t.student.firstName} ${t.student.lastName}` : '',
        admissionNo: t.student?.admissionNumber || '',
        className: t.student?.class?.name || '',
        amountPaid: Number(t.amount || 0),
        balanceRemaining: Number(balancesByStudentId[t.studentId] || 0),
        paymentDate: t.createdAt ? fmtDate(new Date(t.createdAt)) : '',
        paymentMethod: t.paymentMethod || '',
        receiptNo: t.receiptNumber || '',
        transactionRef: t.transactionRef || '',
      }))

      headers = ['Student Name', 'Admission No', 'Class', 'Amount Paid', 'Balance Remaining', 'Payment Date', 'Payment Method', 'Receipt No', 'Transaction Ref']
      keys = ['studentName', 'admissionNo', 'className', 'amountPaid', 'balanceRemaining', 'paymentDate', 'paymentMethod', 'receiptNo', 'transactionRef']
      filename = `fee-payments-${stamp}`
      title = 'Fee Payment Report'
    }

    if (reportType === 'outstanding') {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, year: true },
      })
      if (!activeTerm) {
        rows = []
      } else {
        const students = await db.student.findMany({
          where: {
            status: 'ACTIVE',
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
          include: { class: true },
          orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
        })

        const studentIds = students.map((s) => s.id)
        const classIds = Array.from(new Set(students.map((s) => s.classId)))

        const [structures, payments] = await Promise.all([
          db.feeStructure.findMany({
            where: {
              termId: activeTerm.id,
              status: 'ACTIVE',
              classId: { in: classIds },
            },
            select: { classId: true, category: true, amount: true },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: { termId: activeTerm.id },
            },
            select: { studentId: true, amount: true },
          }),
        ])

        const classBaseTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category === 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const classTransportTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category !== 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const paidTotals = payments.reduce<Record<string, number>>((acc, p) => {
          acc[p.studentId] = (acc[p.studentId] || 0) + Number(p.amount || 0)
          return acc
        }, {})

        rows = students
          .map((student) => {
            const expected = (classBaseTotals[student.classId] || 0) + (student.usesTransport ? classTransportTotals[student.classId] || 0 : 0)
            const paid = paidTotals[student.id] || 0
            const balance = Math.max(0, expected - paid)
            return {
              studentName: `${student.firstName} ${student.lastName}`,
              admissionNo: student.admissionNumber,
              className: student.class?.name || '',
              expectedFees: expected,
              paidAmount: paid,
              balanceDue: balance,
            }
          })
          .filter((r) => r.balanceDue > 0)
      }

      headers = ['Student Name', 'Admission No', 'Class', 'Expected Fees', 'Paid Amount', 'Balance Due']
      keys = ['studentName', 'admissionNo', 'className', 'expectedFees', 'paidAmount', 'balanceDue']
      filename = `outstanding-balances-${stamp}`
      title = 'Outstanding Balances Report'
    }

    if (reportType === 'transport-paid-students') {
      const where: any = {
        status: 'COMPLETED',
        feeStructure: { category: 'TRANSPORT' },
      }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where,
        include: {
          student: { include: { class: true } },
          feeStructure: { include: { term: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const byStudent = transactions.reduce<
        Record<
          string,
          {
            studentName: string
            admissionNo: string
            className: string
            transportPaidAmount: number
            transactions: number
            latestPaymentDate: string
            latestReceiptNo: string
            latestReference: string
            latestTerm: string
          }
        >
      >((acc, tx) => {
        if (!tx.student) return acc
        if (!acc[tx.studentId]) {
          acc[tx.studentId] = {
            studentName: `${tx.student.firstName} ${tx.student.lastName}`,
            admissionNo: tx.student.admissionNumber || '',
            className: tx.student.class?.name || '',
            transportPaidAmount: 0,
            transactions: 0,
            latestPaymentDate: tx.createdAt ? fmtDate(new Date(tx.createdAt)) : '',
            latestReceiptNo: tx.receiptNumber || '',
            latestReference: tx.transactionRef || '',
            latestTerm: tx.feeStructure?.term ? `${tx.feeStructure.term.name} ${tx.feeStructure.term.year}` : '',
          }
        }
        acc[tx.studentId].transportPaidAmount += Number(tx.amount || 0)
        acc[tx.studentId].transactions += 1
        return acc
      }, {})

      rows = Object.values(byStudent).sort((a, b) => a.className.localeCompare(b.className) || a.studentName.localeCompare(b.studentName))

      headers = ['Student Name', 'Admission No', 'Class', 'Transport Amount Paid', 'No. of Payments', 'Latest Payment Date', 'Latest Receipt No', 'Latest Transaction Ref', 'Latest Term']
      keys = ['studentName', 'admissionNo', 'className', 'transportPaidAmount', 'transactions', 'latestPaymentDate', 'latestReceiptNo', 'latestReference', 'latestTerm']
      filename = `transport-paid-students-${stamp}`
      title = 'Students Who Paid Transport Fee'
    }

    if (reportType === 'fee-arrears-students') {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, year: true },
      })
      if (!activeTerm) {
        rows = []
      } else {
        const students = await db.student.findMany({
          where: {
            status: 'ACTIVE',
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
          include: { class: true },
          orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
        })

        const studentIds = students.map((s) => s.id)
        const classIds = Array.from(new Set(students.map((s) => s.classId)))

        const [structures, payments] = await Promise.all([
          db.feeStructure.findMany({
            where: {
              termId: activeTerm.id,
              status: 'ACTIVE',
              classId: { in: classIds },
            },
            select: { classId: true, category: true, amount: true },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: { termId: activeTerm.id },
            },
            select: { studentId: true, amount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          }),
        ])

        const classBaseTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category === 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const classTransportTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category !== 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})

        const paymentAgg = payments.reduce<Record<string, { paid: number; lastDate: Date | null }>>((acc, p) => {
          if (!acc[p.studentId]) {
            acc[p.studentId] = { paid: 0, lastDate: null }
          }
          acc[p.studentId].paid += Number(p.amount || 0)
          if (!acc[p.studentId].lastDate) {
            acc[p.studentId].lastDate = p.createdAt
          }
          return acc
        }, {})

        rows = students
          .map((student) => {
            const tuitionAndOtherExpected = classBaseTotals[student.classId] || 0
            const transportExpected = student.usesTransport ? classTransportTotals[student.classId] || 0 : 0
            const expectedTotal = tuitionAndOtherExpected + transportExpected
            const paidAmount = paymentAgg[student.id]?.paid || 0
            const balanceDue = Math.max(0, expectedTotal - paidAmount)

            return {
              studentName: `${student.firstName} ${student.lastName}`,
              admissionNo: student.admissionNumber,
              className: student.class?.name || '',
              term: `${activeTerm.name} ${activeTerm.year}`,
              expectedFees: expectedTotal,
              paidAmount,
              balanceDue,
              transportIncluded: student.usesTransport ? 'Yes' : 'No',
              lastPaymentDate: paymentAgg[student.id]?.lastDate
                ? fmtDate(new Date(paymentAgg[student.id].lastDate as Date))
                : 'No payment',
            }
          })
          .filter((row) => row.balanceDue > 0)
      }

      headers = ['Student Name', 'Admission No', 'Class', 'Term', 'Expected Fees', 'Paid Amount', 'Balance Due', 'Transport Included', 'Last Payment Date']
      keys = ['studentName', 'admissionNo', 'className', 'term', 'expectedFees', 'paidAmount', 'balanceDue', 'transportIncluded', 'lastPaymentDate']
      filename = `students-fee-arrears-${stamp}`
      title = 'Students with Fee Arrears'
    }

    if (reportType === 'summary') {
      const baseWhere: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') baseWhere.student = { classId }
      if (dateFilter) baseWhere.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where: baseWhere,
        select: { amount: true, createdAt: true },
      })

      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)

      const dayOffset = (now.getDay() + 6) % 7
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - dayOffset)
      startOfWeek.setHours(0, 0, 0, 0)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const inRange = (date: Date, start: Date) => date.getTime() >= start.getTime() && date.getTime() <= now.getTime()
      const aggregatePeriod = (start: Date) => {
        const scoped = transactions.filter((t) => inRange(new Date(t.createdAt), start))
        const total = scoped.reduce((sum, t) => sum + Number(t.amount || 0), 0)
        return { total, count: scoped.length }
      }

      const today = aggregatePeriod(startOfToday)
      const week = aggregatePeriod(startOfWeek)
      const month = aggregatePeriod(startOfMonth)

      rows = [
        { period: 'Today', collections: today.total, transactions: today.count },
        { period: 'This Week', collections: week.total, transactions: week.count },
        { period: 'This Month', collections: month.total, transactions: month.count },
      ]

      headers = ['Period', 'Collections Amount', 'No. of Transactions']
      keys = ['period', 'collections', 'transactions']
      filename = `collections-summary-${stamp}`
      title = 'Daily / Weekly / Monthly Collections Summary'
    }

    if (reportType === 'management-summary') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const [transactions, activeTerm] = await Promise.all([
        db.feeTransaction.findMany({
          where,
          include: { student: true, feeStructure: true },
          orderBy: { createdAt: 'asc' },
        }),
        db.term.findFirst({
          where: { status: 'ACTIVE' },
          select: { id: true, year: true },
        }),
      ])

      const totalCollections = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const mpesaCollections = transactions
        .filter((t) => (t.paymentMethod || '').toUpperCase().includes('MPESA'))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const bankCollections = transactions
        .filter((t) => (t.paymentMethod || '').toUpperCase().includes('BANK'))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const cashCollections = transactions
        .filter((t) => (t.paymentMethod || '').toUpperCase().includes('CASH'))
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      const monthlyByKey = transactions.reduce<Record<string, number>>((acc, t) => {
        const d = new Date(t.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + Number(t.amount || 0)
        return acc
      }, {})

      let outstandingTotal = 0
      if (activeTerm?.id) {
        const students = await db.student.findMany({
          where: {
            status: 'ACTIVE',
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
          select: { id: true, classId: true, usesTransport: true },
        })
        const studentIds = students.map((s) => s.id)
        const classIds = Array.from(new Set(students.map((s) => s.classId)))
        const [structures, termPayments] = await Promise.all([
          db.feeStructure.findMany({
            where: { termId: activeTerm.id, status: 'ACTIVE', classId: { in: classIds } },
            select: { classId: true, category: true, amount: true },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: { termId: activeTerm.id },
            },
            select: { studentId: true, amount: true },
          }),
        ])
        const classBaseTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category === 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const classTransportTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category !== 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const paidTotals = termPayments.reduce<Record<string, number>>((acc, p) => {
          acc[p.studentId] = (acc[p.studentId] || 0) + Number(p.amount || 0)
          return acc
        }, {})
        outstandingTotal = students.reduce((sum, s) => {
          const expected = (classBaseTotals[s.classId] || 0) + (s.usesTransport ? classTransportTotals[s.classId] || 0 : 0)
          const paid = paidTotals[s.id] || 0
          return sum + Math.max(0, expected - paid)
        }, 0)
      }

      const monthlyRows = Object.entries(monthlyByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, amount]) => ({
          section: 'Monthly Income',
          metric: period,
          value: Number(amount),
          notes: 'Fee collections',
        }))

      rows = [
        { section: 'Finance Summary', metric: 'Total Fee Collections', value: Number(totalCollections), notes: 'All completed transactions in selected scope' },
        { section: 'Finance Summary', metric: 'Outstanding Fee Balances', value: Number(outstandingTotal), notes: 'Current active term outstanding' },
        { section: 'Finance Summary', metric: 'M-Pesa Collections', value: Number(mpesaCollections), notes: 'Payment method: M-Pesa' },
        { section: 'Finance Summary', metric: 'Bank Collections', value: Number(bankCollections), notes: 'Payment method: Bank' },
        { section: 'Finance Summary', metric: 'Cash Collections', value: Number(cashCollections), notes: 'Payment method: Cash' },
        ...monthlyRows,
        { section: 'Accounting', metric: 'Expense Summary', value: 'N/A', notes: 'Expense ledger module not configured yet' },
        { section: 'Accounting', metric: 'Budget Report', value: 'N/A', notes: 'Budget module not configured yet' },
        { section: 'Accounting', metric: 'Bank Reconciliation', value: 'N/A', notes: 'Reconciliation module not configured yet' },
      ]

      headers = ['Section', 'Metric', 'Value', 'Notes']
      keys = ['section', 'metric', 'value', 'notes']
      filename = `financial-management-summary-${stamp}`
      title = 'Headteacher Financial Summary Report'
    }

    if (reportType === 'total-collections') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where,
        select: { amount: true, createdAt: true, paymentMethod: true },
      })
      const totalCollections = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)

      rows = [
        {
          metric: 'Total Fee Collections',
          amount: Number(totalCollections),
          transactions: transactions.length,
          periodStart: startDate || 'All time',
          periodEnd: endDate || stamp,
        },
      ]

      headers = ['Metric', 'Amount', 'No. of Transactions', 'Period Start', 'Period End']
      keys = ['metric', 'amount', 'transactions', 'periodStart', 'periodEnd']
      filename = `total-fee-collections-${stamp}`
      title = 'Total Fee Collections Report'
    }

    if (reportType === 'monthly-income') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where,
        select: { amount: true, createdAt: true },
      })
      const monthlyRows = transactions.reduce<Record<string, { total: number; count: number }>>((acc, t) => {
        const d = new Date(t.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!acc[key]) acc[key] = { total: 0, count: 0 }
        acc[key].total += Number(t.amount || 0)
        acc[key].count += 1
        return acc
      }, {})

      rows = Object.entries(monthlyRows)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          incomeAmount: Number(data.total),
          transactions: data.count,
          averageCollection: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
        }))

      headers = ['Month', 'Income Amount', 'No. of Transactions', 'Average Collection']
      keys = ['month', 'incomeAmount', 'transactions', 'averageCollection']
      filename = `monthly-income-${stamp}`
      title = 'Monthly Income Report'
    }

    if (reportType === 'mpesa-summary') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const mpesaTransactions = await db.feeTransaction.findMany({
        where,
        select: { amount: true, createdAt: true, paymentMethod: true, receiptNumber: true, transactionRef: true },
      })
      const onlyMpesa = mpesaTransactions.filter((t) => (t.paymentMethod || '').toUpperCase().includes('MPESA'))
      const monthlyMpesa = onlyMpesa.reduce<Record<string, { total: number; count: number }>>((acc, t) => {
        const d = new Date(t.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!acc[key]) acc[key] = { total: 0, count: 0 }
        acc[key].total += Number(t.amount || 0)
        acc[key].count += 1
        return acc
      }, {})

      const grandTotal = onlyMpesa.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      rows = Object.entries(monthlyMpesa)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({
          month,
          mpesaCollections: Number(data.total),
          transactions: data.count,
          averageAmount: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
          grandTotal: Number(grandTotal),
        }))

      headers = ['Month', 'M-Pesa Collections', 'No. of Transactions', 'Average Amount', 'Grand Total']
      keys = ['month', 'mpesaCollections', 'transactions', 'averageAmount', 'grandTotal']
      filename = `mpesa-payment-summary-${stamp}`
      title = 'M-Pesa Payment Summary Report'
    }

    if (reportType === 'bank-reconciliation') {
      const where: any = { status: 'COMPLETED' }
      if (classId && classId !== 'all') where.student = { classId }
      if (dateFilter) where.createdAt = dateFilter

      const transactions = await db.feeTransaction.findMany({
        where,
        select: { amount: true, createdAt: true, paymentMethod: true, receiptNumber: true, transactionRef: true },
      })
      const bankTransactions = transactions.filter((t) => (t.paymentMethod || '').toUpperCase().includes('BANK'))
      const bankDaily = bankTransactions.reduce<Record<string, { total: number; count: number }>>((acc, t) => {
        const key = new Date(t.createdAt).toISOString().slice(0, 10)
        if (!acc[key]) acc[key] = { total: 0, count: 0 }
        acc[key].total += Number(t.amount || 0)
        acc[key].count += 1
        return acc
      }, {})
      const bankTotal = bankTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const overallTotal = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
      const variance = Number((overallTotal - bankTotal).toFixed(2))

      rows = Object.entries(bankDaily)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date,
          bankCollections: Number(data.total),
          bankTransactions: data.count,
          totalCollections: Number(overallTotal),
          varianceFromTotal: variance,
          reconciliationStatus: 'System summary (manual bank statement matching pending)',
        }))

      if (rows.length === 0) {
        rows = [
          {
            date: startDate || stamp,
            bankCollections: 0,
            bankTransactions: 0,
            totalCollections: Number(overallTotal),
            varianceFromTotal: variance,
            reconciliationStatus: 'No bank transactions in selected period',
          },
        ]
      }

      headers = ['Date', 'Bank Collections', 'Bank Transactions', 'Total Collections', 'Variance From Total', 'Reconciliation Status']
      keys = ['date', 'bankCollections', 'bankTransactions', 'totalCollections', 'varianceFromTotal', 'reconciliationStatus']
      filename = `bank-reconciliation-summary-${stamp}`
      title = 'Bank Reconciliation Summary Report'
    }

    if (reportType === 'expense-summary') {
      rows = [
        {
          section: 'Expenses',
          expenseCategory: 'N/A',
          amount: 'N/A',
          notes: 'Expense ledger module not configured yet',
        },
      ]
      headers = ['Section', 'Expense Category', 'Amount', 'Notes']
      keys = ['section', 'expenseCategory', 'amount', 'notes']
      filename = `expense-summary-${stamp}`
      title = 'Expense Summary Report'
    }

    if (reportType === 'budget-report') {
      rows = [
        {
          section: 'Budget',
          budgetLine: 'N/A',
          allocatedAmount: 'N/A',
          notes: 'Budget module not configured yet',
        },
      ]
      headers = ['Section', 'Budget Line', 'Allocated Amount', 'Notes']
      keys = ['section', 'budgetLine', 'allocatedAmount', 'notes']
      filename = `budget-report-${stamp}`
      title = 'Budget Report'
    }

    if (reportType === 'statements') {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, year: true },
      })

      if (!activeTerm) {
        rows = []
      } else {
        const students = await db.student.findMany({
          where: {
            status: 'ACTIVE',
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
          include: { class: true },
          orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
        })

        const studentIds = students.map((s) => s.id)
        const classIds = Array.from(new Set(students.map((s) => s.classId)))

        const [structures, payments] = await Promise.all([
          db.feeStructure.findMany({
            where: {
              termId: activeTerm.id,
              status: 'ACTIVE',
              classId: { in: classIds },
            },
            select: { classId: true, category: true, amount: true },
          }),
          db.feeTransaction.findMany({
            where: {
              studentId: { in: studentIds },
              status: 'COMPLETED',
              feeStructure: { termId: activeTerm.id },
            },
            select: { studentId: true, amount: true, createdAt: true, paymentMethod: true, receiptNumber: true },
            orderBy: { createdAt: 'desc' },
          }),
        ])

        const classBaseTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category === 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})
        const classTransportTotals = structures.reduce<Record<string, number>>((acc, s) => {
          if (s.category !== 'TRANSPORT') return acc
          acc[s.classId] = (acc[s.classId] || 0) + Number(s.amount || 0)
          return acc
        }, {})

        const paymentAgg = payments.reduce<
          Record<string, { paid: number; lastDate: Date | null; lastMethod: string; lastReceipt: string }>
        >((acc, p) => {
          if (!acc[p.studentId]) {
            acc[p.studentId] = { paid: 0, lastDate: null, lastMethod: '', lastReceipt: '' }
          }
          acc[p.studentId].paid += Number(p.amount || 0)
          if (!acc[p.studentId].lastDate) {
            acc[p.studentId].lastDate = p.createdAt
            acc[p.studentId].lastMethod = p.paymentMethod || ''
            acc[p.studentId].lastReceipt = p.receiptNumber || ''
          }
          return acc
        }, {})

        rows = students.map((student) => {
          const expected = (classBaseTotals[student.classId] || 0) + (student.usesTransport ? classTransportTotals[student.classId] || 0 : 0)
          const paidData = paymentAgg[student.id] || { paid: 0, lastDate: null, lastMethod: '', lastReceipt: '' }
          const balance = Math.max(0, expected - paidData.paid)
          return {
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNo: student.admissionNumber,
            className: student.class?.name || '',
            expectedFees: expected,
            paidAmount: paidData.paid,
            balanceDue: balance,
            lastPaymentDate: paidData.lastDate ? fmtDate(new Date(paidData.lastDate)) : 'No payment',
            lastPaymentMethod: paidData.lastMethod || '-',
            lastReceiptNo: paidData.lastReceipt || '-',
          }
        })
      }

      headers = ['Student Name', 'Admission No', 'Class', 'Expected Fees', 'Paid Amount', 'Balance Due', 'Last Payment Date', 'Last Payment Method', 'Last Receipt No']
      keys = ['studentName', 'admissionNo', 'className', 'expectedFees', 'paidAmount', 'balanceDue', 'lastPaymentDate', 'lastPaymentMethod', 'lastReceiptNo']
      filename = `fee-statements-${stamp}`
      title = 'Fee Statements Report'
    }

    await logExport({
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: 'FINANCE',
      reportType,
      format: format === 'excel' ? 'xls' : format,
      userId: authed.id,
      userName: authed.name,
      role: authed.role,
      filters: {
        classId: classId || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      rowCount: rows.length,
      createdAt: new Date().toISOString(),
    })

    if (format === 'xls' || format === 'excel') {
      const html = toXlsHtml(headers, rows, keys)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.xls"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdf = await toPdf(title, headers, rows, keys, stamp)
      return new NextResponse(pdf.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          ...(pdf.truncated ? { 'X-Export-Truncated': 'true' } : {}),
        },
      })
    }

    const csv = toCsv(headers, rows, keys)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
