'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Search, DollarSign, Download, Banknote, Smartphone, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { feesApi, refApi } from '@/lib/api'
import { FeeFormDialog } from './FeeFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { type LucideIcon } from 'lucide-react'

interface TransactionRow {
  id: string
  studentName: string
  feeName?: string
  amount: number
  receiptNumber: string
  paymentMethod: string
  status: string
  createdAt: string
  term?: string
}

export function FeePayments() {
  const { classes, setClasses } = useAppStore()
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [search, setSearch] = useState('')
  const [localClasses, setLocalClasses] = useState(classes)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await feesApi.transactions({ classId: filterClass })
      if (res.success && res.data) {
        const items = res.data.items || res.data || []
        setTransactions(items.map((t: any) => ({
          id: t.id,
          studentName: t.student?.firstName ? `${t.student.firstName} ${t.student.lastName}` : 'Unknown',
          feeName: t.feeStructure?.name,
          amount: t.amount,
          receiptNumber: t.receiptNumber,
          paymentMethod: t.paymentMethod,
          status: t.status,
          createdAt: t.createdAt,
          term: t.term,
        })))
      } else {
        setTransactions([
          { id: '1', studentName: 'John Kamau', feeName: 'Term 1 Tuition', amount: 15000, receiptNumber: 'RCT-001', paymentMethod: 'MPESA', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '2', studentName: 'Mary Wanjiku', feeName: 'Term 1 Tuition', amount: 25000, receiptNumber: 'RCT-002', paymentMethod: 'BANK', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '3', studentName: 'Peter Ochieng', feeName: 'Transport Fee', amount: 10000, receiptNumber: 'RCT-003', paymentMethod: 'CASH', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '4', studentName: 'Grace Akinyi', feeName: 'Term 1 Tuition', amount: 20000, receiptNumber: 'RCT-004', paymentMethod: 'MPESA', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '5', studentName: 'David Mwangi', feeName: 'Lunch Program', amount: 5000, receiptNumber: 'RCT-005', paymentMethod: 'MPESA', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '6', studentName: 'Sarah Njeri', feeName: 'Term 1 Tuition', amount: 35000, receiptNumber: 'RCT-006', paymentMethod: 'BANK', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '7', studentName: 'James Otieno', feeName: 'Term 1 Tuition', amount: 15000, receiptNumber: 'RCT-007', paymentMethod: 'CASH', status: 'PENDING', createdAt: new Date().toISOString(), term: '2025-1' },
          { id: '8', studentName: 'Ann Muthoni', feeName: 'Term 1 Tuition', amount: 30000, receiptNumber: 'RCT-008', paymentMethod: 'MPESA', status: 'COMPLETED', createdAt: new Date().toISOString(), term: '2025-1' },
        ])
      }
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [filterClass])

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
  }, [classes, setClasses])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const filtered = transactions.filter((t) =>
    t.studentName.toLowerCase().includes(search.toLowerCase()) ||
    t.receiptNumber.toLowerCase().includes(search.toLowerCase())
  )

  const totalCollected = filtered
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOutstanding = filtered
    .filter((t) => t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0)

  const collectionRate = filtered.length > 0
    ? ((filtered.filter((t) => t.status === 'COMPLETED').length / filtered.length) * 100).toFixed(1)
    : '0'

  const methodColors: Record<string, string> = {
    CASH: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
    MPESA: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
    BANK: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
  }

  const methodIconMap: Record<string, { icon: LucideIcon; className: string }> = {
    CASH: { icon: Banknote, className: 'text-green-600 dark:text-green-400' },
    MPESA: { icon: Smartphone, className: 'text-teal-600 dark:text-teal-400' },
    BANK: { icon: Landmark, className: 'text-sky-600 dark:text-sky-400' },
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-50 via-white to-green-50/30 dark:from-green-900/20 dark:via-slate-800 dark:to-green-950/10 border-green-200/60 dark:border-green-800/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-green-600/80 dark:text-green-400/80 font-medium">Total Collected</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 tabular-nums">KES {totalCollected.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-900/20 dark:via-slate-800 dark:to-amber-950/10 border-amber-200/60 dark:border-amber-800/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 font-medium">Outstanding</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">KES {totalOutstanding.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-teal-50 via-white to-teal-50/30 dark:from-teal-900/20 dark:via-slate-800 dark:to-teal-950/10 border-teal-200/60 dark:border-teal-800/40">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-teal-600/80 dark:text-teal-400/80 font-medium">Collection Rate</p>
                <p className="text-xl font-bold text-teal-700 dark:text-teal-400 tabular-nums">{collectionRate}%</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by student or receipt..."
            className="pl-9 h-10 bg-white dark:bg-slate-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-slate-800">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {localClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Record Payment
        </Button>
      </div>

      {/* Transactions Table */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payment History</CardTitle>
            <div className="text-right">
              <p className="text-xs text-slate-400 dark:text-slate-500">Total Collected</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">KES {totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Receipt #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Student</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Fee Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Method</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Status</TableHead>
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
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No transactions found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t, index) => {
                  const MethodIcon = methodIconMap[t.paymentMethod]?.icon || Banknote
                  const methodIconClass = methodIconMap[t.paymentMethod]?.className || 'text-slate-400'
                  return (
                    <TableRow key={t.id} className={cn(
                      'hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group',
                      index % 2 === 0
                        ? 'bg-white dark:bg-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-800/50'
                    )}>
                      <TableCell className="text-sm font-mono text-slate-500 dark:text-slate-400">{t.receiptNumber}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.studentName}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">{t.feeName}</TableCell>
                      <TableCell className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">KES {t.amount.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MethodIcon className={cn('w-3.5 h-3.5', methodIconClass)} />
                          <Badge variant="outline" className={cn('text-[10px] font-medium', methodColors[t.paymentMethod] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600')}>
                            {t.paymentMethod}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {format(new Date(t.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge variant="outline" className={cn(
                            'text-[10px] font-medium',
                            t.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                            t.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' :
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                          )}>
                            {t.status === 'COMPLETED' ? '✓ ' : t.status === 'PENDING' ? '◷ ' : '✗ '}{t.status}
                          </Badge>
                          {t.status === 'COMPLETED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toast.info('Receipt download coming soon')}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FeeFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadTransactions}
        mode="payment"
      />
    </div>
  )
}
