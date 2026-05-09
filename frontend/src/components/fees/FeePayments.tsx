'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Search, DollarSign, FileDown, TrendingUp, Wallet, Percent, Smartphone, Landmark, Banknote, Filter, Bus, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi, studentsApi } from '@/lib/api'
import { FeeFormDialog } from './FeeFormDialog'
import { MpesaPaymentDialog } from './MpesaPaymentDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ClassFeeSummary } from './ClassFeeSummary'
import { getClassDisplayName, sortClassesByLevelAndStream } from '@/lib/class-sort'

interface TransactionRow {
  id: string
  studentId?: string
  studentName: string
  feeName?: string
  feeStructureId?: string
  amount: number
  receiptNumber: string
  paymentMethod: string
  status: string
  createdAt: string
  term?: string
}

interface TransportRosterRow {
  id: string
  name: string
  admissionNumber: string
  class: {
    id: string
    name: string
    stream?: string | null
  }
  transportFee: {
    expected: number
    paid: number
    balance: number
    paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
    paymentCount: number
    lastPaymentAt: string | null
    lastPaymentMethod: string | null
    lastPaymentAmount: number
    lastReceiptNumber: string | null
    suggestedFeeStructureId: string | null
  }
}

// Circular Progress Component
function CircularProgress({ value, size = 100, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const strokeColor = value >= 80 ? '#059669' : value >= 60 ? '#0d9488' : value >= 40 ? '#f59e0b' : '#ef4444'
  const bgColor = value >= 80 ? '#d1fae5' : value >= 60 ? '#ccfbf1' : value >= 40 ? '#fef3c7' : '#fee2e2'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value.toFixed(1)}%</p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">collected</p>
        </div>
      </div>
    </div>
  )
}

const methodFilterOptions = [
  { value: 'ALL', label: 'All', icon: Filter },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'MPESA', label: 'M-Pesa', icon: Smartphone },
  { value: 'BANK', label: 'Bank Transfer', icon: Landmark },
]

export function FeePayments({ termId, view = 'payments' }: { termId?: string; view?: 'payments' | 'transport' }) {
  const { classes, setClasses, terms, setTerms } = useAppStore()
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentPrefill, setPaymentPrefill] = useState<{
    studentId?: string
    classId?: string
    feeStructureId?: string
    termId?: string
    amount?: number
  } | null>(null)
  const [filterClass, setFilterClass] = useState('')
  const [search, setSearch] = useState('')
  const [localClasses, setLocalClasses] = useState(classes)
  const [methodFilter, setMethodFilter] = useState('ALL')

  // M-Pesa quick pay dialog
  const [mpesaQuickPayOpen, setMpesaQuickPayOpen] = useState(false)
  const [mpesaResetKey, setMpesaResetKey] = useState(0)

  // Students and fee structures for M-Pesa quick pay
  const [students, setStudents] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedFee, setSelectedFee] = useState('')
  const [resolvedTermCode, setResolvedTermCode] = useState<string | undefined>(undefined)
  const [transportRoster, setTransportRoster] = useState<TransportRosterRow[]>([])
  const [transportSummary, setTransportSummary] = useState<{
    expectedTotal: number
    paidTotal: number
    balanceTotal: number
    paidStudents: number
    partialStudents: number
    unpaidStudents: number
  } | null>(null)
  const [transportLoading, setTransportLoading] = useState(false)
  const [creatingTransportStructures, setCreatingTransportStructures] = useState(false)

  useEffect(() => {
    if (!termId || terms.length === 0) {
      setResolvedTermCode(undefined)
      return
    }
    const activeTerm = terms.find((term: any) => term.id === termId)
    if (!activeTerm) {
      setResolvedTermCode(undefined)
      return
    }
    const termNumber = Number(String(activeTerm.name || '').match(/\d+/)?.[0] || '1')
    setResolvedTermCode(`${activeTerm.year}-${termNumber}`)
  }, [termId, terms])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await feesApi.transactions({ classId: filterClass, term: resolvedTermCode })
      if (res.success && res.data) {
        const items = res.data.items || res.data || []
        setTransactions(items.map((t: any) => ({
          id: t.id,
          studentId: t.student?.id,
          studentName: t.student?.firstName ? `${t.student.firstName} ${t.student.lastName}` : 'Unknown',
          feeName: t.feeStructure?.name,
          feeStructureId: t.feeStructure?.id,
          amount: t.amount,
          receiptNumber: t.receiptNumber,
          paymentMethod: t.paymentMethod,
          status: t.status,
          createdAt: t.createdAt,
          term: t.term,
        })))
      } else {
        setTransactions([])
      }
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [filterClass, resolvedTermCode])

  const loadTransportRoster = useCallback(async () => {
    setTransportLoading(true)
    try {
      const res = await feesApi.transportRoster({
        classId: filterClass || undefined,
        termId: termId || undefined,
      })
      if (res.success && res.data) {
        setTransportRoster(res.data.students || [])
        setTransportSummary(res.data.summary || null)
      } else {
        setTransportRoster([])
        setTransportSummary(null)
      }
    } catch {
      setTransportRoster([])
      setTransportSummary(null)
    } finally {
      setTransportLoading(false)
    }
  }, [filterClass, termId])

  const handleCreateTransportStructures = async () => {
    if (!termId) {
      toast.error('Select a term first to create transport structures')
      return
    }
    setCreatingTransportStructures(true)
    try {
      const res = await feesApi.createTransportStructures(termId)
      if (res.success && res.data) {
        toast.success(
          `Transport structures ready: ${res.data.createdCount} created, ${res.data.skippedCount} skipped`
        )
        await loadTransportRoster()
      } else {
        toast.error(res.error || 'Failed to create transport structures')
      }
    } catch {
      toast.error('Failed to create transport structures')
    } finally {
      setCreatingTransportStructures(false)
    }
  }

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
    if (terms.length === 0) {
      refApi.terms().then((res) => {
        if (res.success && res.data) setTerms(res.data)
      })
    }
  }, [classes, setClasses, terms, setTerms])

  useEffect(() => {
    if (view === 'payments') loadTransactions()
    if (view === 'transport') loadTransportRoster()
  }, [loadTransactions, loadTransportRoster, view])

  // Load students and fee structures for M-Pesa quick pay
  useEffect(() => {
    if (mpesaQuickPayOpen) {
      Promise.all([
        studentsApi.list({ limit: 500, status: 'ACTIVE' }),
        feesApi.structures({ limit: 100, ...(termId ? { termId } : {}) }),
      ]).then(([studentRes, feeRes]) => {
        if (studentRes.success && studentRes.data) {
          const items = studentRes.data.items || studentRes.data || []
          setStudents(items)
        }
        if (feeRes.success && feeRes.data) {
          const items = feeRes.data.items || feeRes.data || []
          setFeeStructures(items)
        }
      })
    }
  }, [mpesaQuickPayOpen, termId])

  // Apply all filters
  const filtered = transactions.filter((t) => {
    const matchesSearch = t.studentName.toLowerCase().includes(search.toLowerCase()) ||
      t.receiptNumber.toLowerCase().includes(search.toLowerCase())
    const matchesMethod = methodFilter === 'ALL' || t.paymentMethod === methodFilter
    return matchesSearch && matchesMethod
  })

  const filteredTransportRoster = transportRoster.filter((row) => {
    const normalized = search.toLowerCase()
    if (!normalized) return true
    return (
      row.name.toLowerCase().includes(normalized) ||
      row.admissionNumber.toLowerCase().includes(normalized) ||
      row.class.name.toLowerCase().includes(normalized)
    )
  })

  const totalCollected = filtered
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOutstanding = filtered
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0)

  const collectionRate = totalAmount > 0
    ? ((totalCollected / totalAmount) * 100)
    : 0

  const completedCount = filtered.filter((t) => t.status === 'COMPLETED').length
  const pendingCount = filtered.filter((t) => t.status === 'PENDING').length

  const methodColors: Record<string, string> = {
    CASH: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
    MPESA: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
    BANK: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
  }

  const methodIcons: Record<string, string> = {
    CASH: '💵',
    MPESA: '📱',
    BANK: '🏦',
  }

  const statusConfig: Record<string, { className: string; icon: string }> = {
    COMPLETED: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', icon: '✓' },
    PENDING: { className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', icon: '◷' },
    FAILED: { className: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', icon: '✗' },
  }

  const handleDownloadReceipt = (receiptNumber: string) => {
    window.open(`/api/fees/receipt/${receiptNumber}`, '_blank')
  }

  const handleOpenPaymentUpdate = (payload: {
    studentId: string
    studentName: string
    classId?: string
    termId: string | null
    suggestedFeeStructureId?: string | null
    amount?: number
  }) => {
    setPaymentPrefill({
      studentId: payload.studentId,
      classId: payload.classId || undefined,
      termId: payload.termId || undefined,
      feeStructureId: payload.suggestedFeeStructureId || undefined,
      amount: payload.amount,
    })
    setDialogOpen(true)
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)

  const selectedStudentObj = students.find((s: any) => s.id === selectedStudent)
  const selectedFeeObj = feeStructures.find((f: any) => f.id === selectedFee)
  const classFilterOptions = useMemo(() => sortClassesByLevelAndStream(localClasses), [localClasses])

  if (view === 'transport') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Search day student, admission, or class..."
              className="pl-9 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classFilterOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{getClassDisplayName(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleCreateTransportStructures}
            disabled={creatingTransportStructures}
          >
            {creatingTransportStructures ? 'Preparing...' : 'Create Term Transport Structures'}
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => {
              setPaymentPrefill(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Record Transport Payment
          </Button>
        </div>

        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                  <Bus className="w-4 h-4 text-sky-700 dark:text-sky-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Day Students - Transport Fee</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    List of students expected to pay transport. Use update to record or top-up payment.
                  </p>
                </div>
              </div>
              {transportSummary && (
                <div className="text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Outstanding Transport</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatCurrency(transportSummary.balanceTotal)}
                  </p>
                </div>
              )}
            </div>

            {transportSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                <MiniSummary label="Expected" value={formatCurrency(transportSummary.expectedTotal)} />
                <MiniSummary label="Paid" value={formatCurrency(transportSummary.paidTotal)} />
                <MiniSummary label="Balance" value={formatCurrency(transportSummary.balanceTotal)} />
                <MiniSummary label="Paid Students" value={transportSummary.paidStudents} />
                <MiniSummary label="Partial" value={transportSummary.partialStudents} />
                <MiniSummary label="Unpaid" value={transportSummary.unpaidStudents} />
              </div>
            )}

            <div className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/70">
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Class</TableHead>
                    <TableHead className="text-xs">Expected</TableHead>
                    <TableHead className="text-xs">Paid</TableHead>
                    <TableHead className="text-xs">Balance</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Last Payment</TableHead>
                    <TableHead className="text-xs w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transportLoading ? (
                    [...Array(5)].map((_, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransportRoster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                        No day students found for transport in this class/term.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransportRoster.map((row) => {
                      const statusColor =
                        row.transportFee.paymentStatus === 'PAID'
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800'
                          : row.transportFee.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800'
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{row.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{row.admissionNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                            {row.class.name}{row.class.stream ? ` ${row.class.stream}` : ''}
                          </TableCell>
                          <TableCell className="text-sm">{formatCurrency(row.transportFee.expected)}</TableCell>
                          <TableCell className="text-sm text-emerald-700 dark:text-emerald-300">{formatCurrency(row.transportFee.paid)}</TableCell>
                          <TableCell className="text-sm font-medium text-amber-700 dark:text-amber-300">{formatCurrency(row.transportFee.balance)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-[10px] font-medium', statusColor)}>
                              {row.transportFee.paymentStatus === 'PAID' ? (
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                              ) : (
                                <AlertCircle className="w-3 h-3 mr-1" />
                              )}
                              {row.transportFee.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400">
                            {row.transportFee.lastPaymentAt
                              ? `${format(new Date(row.transportFee.lastPaymentAt), 'dd MMM HH:mm')} · ${row.transportFee.lastPaymentMethod || ''}`
                              : 'No payment yet'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => handleOpenPaymentUpdate({
                                studentId: row.id,
                                studentName: row.name,
                                classId: row.class.id,
                                termId: termId || null,
                                suggestedFeeStructureId: row.transportFee.suggestedFeeStructureId,
                                amount: row.transportFee.balance > 0 ? row.transportFee.balance : row.transportFee.expected,
                              })}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <FeeFormDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false)
            setPaymentPrefill(null)
          }}
          onSuccess={() => {
            loadTransactions()
            loadTransportRoster()
          }}
          mode="payment"
          paymentCategory="TRANSPORT"
          initialPayment={paymentPrefill}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Fee Collection Progress Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Circular Progress */}
              <div className="flex-shrink-0">
                <CircularProgress value={collectionRate} size={110} strokeWidth={10} />
              </div>

              {/* Stats */}
              <div className="flex-1 w-full">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Fee Collection Progress</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/30">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">Collected</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(totalCollected)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">Outstanding</p>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(totalOutstanding)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-900/15 border border-teal-100 dark:border-teal-800/30">
                    <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                      <Percent className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wider">Rate</p>
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{collectionRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-700/20 border border-slate-200/60 dark:border-slate-700/30">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by student or receipt..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classFilterOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>{getClassDisplayName(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm shadow-green-500/20"
            onClick={() => {
              setMpesaResetKey((prev) => prev + 1)
              setMpesaQuickPayOpen(true)
            }}
          >
            <Smartphone className="w-4 h-4 mr-2" /> Pay via M-Pesa
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => {
              setPaymentPrefill(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Payment Method Filter Tabs */}
      <div className="flex items-center gap-2">
        {methodFilterOptions.map((filter) => {
          const isActive = methodFilter === filter.value
          const Icon = filter.icon
          return (
            <button
              key={filter.value}
              onClick={() => setMethodFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium">{filtered.length} transactions</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {completedCount} completed
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {pendingCount} pending
          </span>
        )}
      </div>

      <ClassFeeSummary
        classId={filterClass || undefined}
        termId={termId}
        mode="detailed"
        onUpdateStudent={handleOpenPaymentUpdate}
      />

      {/* Transactions Table */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Receipt #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Student</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Fee Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Method</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Date & Time</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <DollarSign className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No transactions found</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => {
                  const statusCfg = statusConfig[t.status] || statusConfig.COMPLETED
                  return (
                    <TableRow key={t.id} className={cn(
                      'transition-colors',
                      t.status === 'PENDING' && 'bg-amber-50/20 dark:bg-amber-900/5 hover:bg-amber-50/40 dark:hover:bg-amber-900/10',
                      t.status === 'FAILED' && 'bg-red-50/20 dark:bg-red-900/5 hover:bg-red-50/40 dark:hover:bg-red-900/10',
                      t.status === 'COMPLETED' && 'hover:bg-slate-50 dark:hover:bg-slate-700/40',
                    )}>
                      <TableCell className="text-sm font-mono text-slate-500 dark:text-slate-400">{t.receiptNumber}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.studentName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">{t.feeName}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100">KES {t.amount.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={cn('text-[10px] font-medium', methodColors[t.paymentMethod] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600')}>
                          {methodIcons[t.paymentMethod] || ''} {t.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {format(new Date(t.createdAt), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px] font-medium', statusCfg.className)}>
                          {statusCfg.icon} {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.status === 'COMPLETED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => handleDownloadReceipt(t.receiptNumber)}
                            title="Download Receipt"
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <FeeFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setPaymentPrefill(null)
        }}
        onSuccess={() => {
          loadTransactions()
          loadTransportRoster()
        }}
        mode="payment"
        initialStructureTermId={termId}
        initialPayment={paymentPrefill}
      />

      {/* M-Pesa Quick Pay Dialog - Selector */}
      {mpesaQuickPayOpen && (
        <MpesaQuickPaySelector
          open={mpesaQuickPayOpen}
          onClose={() => setMpesaQuickPayOpen(false)}
          students={students}
          feeStructures={feeStructures}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          selectedFee={selectedFee}
          setSelectedFee={setSelectedFee}
          onStartPayment={() => {
            if (!selectedStudent || !selectedFee) {
              toast.error('Please select a student and fee structure')
              return
            }
            setMpesaQuickPayOpen(false)
          }}
        />
      )}

      {/* M-Pesa Payment Dialog (after selection) */}
      {selectedStudent && selectedFee && (
        <MpesaPaymentDialog
          key={mpesaResetKey}
          open={!mpesaQuickPayOpen && selectedStudent !== ''}
          onClose={() => {
            setSelectedStudent('')
            setSelectedFee('')
          }}
          resetKey={mpesaResetKey}
          amount={selectedFeeObj?.amount || 0}
          feeDescription={selectedFeeObj?.name || 'School Fees'}
          studentName={selectedStudentObj ? `${selectedStudentObj.firstName} ${selectedStudentObj.lastName}` : 'Student'}
          studentId={selectedStudent}
          feeStructureId={selectedFee}
          term={resolvedTermCode || `${new Date().getFullYear()}-1`}
          onSuccess={() => {
            setSelectedStudent('')
            setSelectedFee('')
            loadTransactions()
            loadTransportRoster()
          }}
        />
      )}
    </div>
  )
}

// M-Pesa Quick Pay Selector - Dialog for selecting student and fee before M-Pesa payment
function MpesaQuickPaySelector({
  open,
  onClose,
  students,
  feeStructures,
  selectedStudent,
  setSelectedStudent,
  selectedFee,
  setSelectedFee,
  onStartPayment,
}: {
  open: boolean
  onClose: () => void
  students: any[]
  feeStructures: any[]
  selectedStudent: string
  setSelectedStudent: (v: string) => void
  selectedFee: string
  setSelectedFee: (v: string) => void
  onStartPayment: () => void
}) {
  const selectedFeeObj = feeStructures.find((f: any) => f.id === selectedFee)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Green Header */}
        <div className="relative bg-gradient-to-br from-green-600 via-green-600 to-emerald-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Quick M-Pesa Payment</h2>
              <p className="text-green-100 text-sm">Select student and fee to pay</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Student</label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select student..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.admissionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fee Structure</label>
            <Select value={selectedFee} onValueChange={(val) => {
              setSelectedFee(val)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee to pay..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {feeStructures.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} — KES {f.amount?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFeeObj && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-3 text-center">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Amount to Pay</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                KES {selectedFeeObj.amount?.toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={onStartPayment}
              disabled={!selectedStudent || !selectedFee}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Continue to M-Pesa
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function MiniSummary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-800/50 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}
