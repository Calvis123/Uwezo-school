'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { dashboardApi, refApi, feesApi } from '@/lib/api'
import { StatsCards } from './StatsCards'
import { DashboardCharts } from './Charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalStudents: number
  totalClasses: number
  feeCollection: number
  attendanceRate: number
  activeStudents: number
}

interface RecentPayment {
  id: string
  studentName: string
  amount: number
  receiptNumber: string
  paymentMethod: string
  createdAt: string
  status: string
}

export function DashboardHome() {
  const { navigateTo, setClasses, setTerms, classes } = useAppStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load reference data
      const [classesRes, termsRes] = await Promise.all([
        refApi.classes(),
        refApi.terms(),
      ])
      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data)
      }
      if (termsRes.success && termsRes.data) {
        setTerms(termsRes.data)
      }

      // Load dashboard stats
      const statsRes = await dashboardApi.stats()
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      } else {
        // Use default stats when API not ready
        setStats({
          totalStudents: 245,
          totalClasses: 8,
          feeCollection: 2850000,
          attendanceRate: 94.5,
          activeStudents: 238,
        })
      }

      // Load recent payments
      const feesRes = await feesApi.transactions({ limit: 10 })
      if (feesRes.success && feesRes.data) {
        setRecentPayments(feesRes.data.items || feesRes.data || [])
      } else {
        // Demo data
        setRecentPayments([
          { id: '1', studentName: 'John Kamau', amount: 15000, receiptNumber: 'RCT-001', paymentMethod: 'MPESA', createdAt: new Date().toISOString(), status: 'COMPLETED' },
          { id: '2', studentName: 'Mary Wanjiku', amount: 25000, receiptNumber: 'RCT-002', paymentMethod: 'BANK', createdAt: new Date().toISOString(), status: 'COMPLETED' },
          { id: '3', studentName: 'Peter Ochieng', amount: 10000, receiptNumber: 'RCT-003', paymentMethod: 'CASH', createdAt: new Date().toISOString(), status: 'COMPLETED' },
          { id: '4', studentName: 'Grace Akinyi', amount: 20000, receiptNumber: 'RCT-004', paymentMethod: 'MPESA', createdAt: new Date().toISOString(), status: 'COMPLETED' },
          { id: '5', studentName: 'David Mwangi', amount: 15000, receiptNumber: 'RCT-005', paymentMethod: 'MPESA', createdAt: new Date().toISOString(), status: 'COMPLETED' },
        ])
      }
    } catch {
      setStats({
        totalStudents: 245,
        totalClasses: 8,
        feeCollection: 2850000,
        attendanceRate: 94.5,
        activeStudents: 238,
      })
      setRecentPayments([])
    } finally {
      setLoading(false)
    }
  }

  const classData = classes?.length
    ? classes.map((c) => ({ name: c.name, students: c._count?.students || 0 }))
    : [
        { name: 'Grade 1', students: 32 },
        { name: 'Grade 2', students: 28 },
        { name: 'Grade 3', students: 35 },
        { name: 'Grade 4', students: 30 },
        { name: 'Grade 5', students: 27 },
        { name: 'Grade 6', students: 31 },
        { name: 'Grade 7', students: 29 },
        { name: 'Grade 8', students: 33 },
      ]

  const genderData = [
    { name: 'Boys', value: stats ? Math.round(stats.totalStudents * 0.52) : 127 },
    { name: 'Girls', value: stats ? Math.round(stats.totalStudents * 0.48) : 118 },
  ]

  const feeTrendData = [
    { month: 'Jan', collected: 450000, outstanding: 800000 },
    { month: 'Feb', collected: 620000, outstanding: 650000 },
    { month: 'Mar', collected: 380000, outstanding: 520000 },
    { month: 'Apr', collected: 550000, outstanding: 400000 },
    { month: 'May', collected: 470000, outstanding: 280000 },
    { month: 'Jun', collected: 380000, outstanding: 150000 },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Welcome back! 👋</h2>
            <p className="text-teal-100 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Charts */}
      <DashboardCharts
        classData={classData}
        genderData={genderData}
        feeTrendData={feeTrendData}
        loading={loading}
      />

      {/* Quick Actions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="shadow-sm border-slate-200/60 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200"
                onClick={() => navigateTo('students')}
              >
                <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add Student</p>
                  <p className="text-xs text-slate-400">Register a new student</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                onClick={() => navigateTo('fees')}
              >
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Record Payment</p>
                  <p className="text-xs text-slate-400">Process fee payment</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                onClick={() => navigateTo('attendance')}
              >
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Take Attendance</p>
                  <p className="text-xs text-slate-400">Mark daily attendance</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card className="shadow-sm border-slate-200/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700">Recent Payments</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 text-xs"
                  onClick={() => navigateTo('fees')}
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No recent payments
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Student</TableHead>
                      <TableHead className="text-xs">Receipt</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.slice(0, 5).map((payment) => (
                      <TableRow key={payment.id} className="cursor-pointer hover:bg-slate-50">
                        <TableCell className="text-sm font-medium">{payment.studentName}</TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">{payment.receiptNumber}</TableCell>
                        <TableCell className="text-sm font-semibold text-slate-900">
                          KES {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-[10px]">
                            {payment.paymentMethod}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
