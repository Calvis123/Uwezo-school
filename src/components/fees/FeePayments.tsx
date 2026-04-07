'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Search, Download, DollarSign, FileDown } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const methodIcons: Record<string, string> = {
    CASH: '💵',
    MPESA: '📱',
    BANK: '🏦',
  }

  const handleDownloadReceipt = (receiptNumber: string) => {
    window.open(`/api/fees/receipt/${receiptNumber}`, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Collected</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">KES {totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">KES {totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Collection Rate</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

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
              <p className="text-sm font-bold text-green-600 dark:text-green-400">KES {totalCollected.toLocaleString()}</p>
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
                      <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No transactions found</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
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
                      {format(new Date(t.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        'text-[10px] font-medium',
                        t.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' :
                        t.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' :
                        'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                      )}>
                        {t.status === 'COMPLETED' ? '✓ ' : t.status === 'PENDING' ? '◷ ' : '✗ '}{t.status}
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
                ))
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
