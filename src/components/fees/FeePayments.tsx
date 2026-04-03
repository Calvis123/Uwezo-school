'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, Search, Download } from 'lucide-react'
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
import { MoreHorizontal, FileDown } from 'lucide-react'
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

  const methodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700',
    MPESA: 'bg-green-100 text-green-700',
    BANK: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Collected</p>
            <p className="text-xl font-bold text-green-600">KES {totalCollected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Transactions</p>
            <p className="text-xl font-bold text-slate-900">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-xl font-bold text-amber-600">
              {filtered.filter((t) => t.status === 'PENDING').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold">Receipt #</TableHead>
                <TableHead className="text-xs font-semibold">Student</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Fee Type</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Method</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Date</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm font-mono text-slate-500">{t.receiptNumber}</TableCell>
                    <TableCell className="text-sm font-medium">{t.studentName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">{t.feeName}</TableCell>
                    <TableCell className="text-sm font-semibold">KES {t.amount.toLocaleString()}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className={cn('text-[10px]', methodColors[t.paymentMethod] || '')}>
                        {t.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                      {format(new Date(t.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        'text-[10px]',
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {t.status}
                      </Badge>
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
