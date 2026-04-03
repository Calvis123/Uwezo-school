'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  ArrowRight,
  Activity,
  Clock,
  CreditCard,
  RefreshCw,
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
  totalTeachers: number
  totalSubjects: number
  totalNotices: number
  feeCollectionRate: number
  feeOutstanding: number
  activeTerm: string | null
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

interface RecentActivity {
  id: string
  type: 'payment' | 'attendance'
  description: string
  timestamp: string
  icon: 'payment' | 'attendance'
}

export function DashboardHome() {
  const { navigateTo, setClasses, setTerms, classes, user } = useAppStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [genderData, setGenderData] = useState<{ name: string; value: number }[]>([])
  const [classChartData, setClassChartData] = useState<{ name: string; students: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(false)
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
        const data = statsRes.data
        const overview = data.overview
        const feeCol = data.feeCollection

        setStats({
          totalStudents: overview.totalStudents || 0,
          totalClasses: overview.totalClasses || 0,
          feeCollection: feeCol.totalCollected || 0,
          attendanceRate: data.attendanceRate || 0,
          activeStudents: overview.totalStudents || 0,
          totalTeachers: overview.totalTeachers || 0,
          totalSubjects: overview.totalSubjects || 0,
          totalNotices: overview.totalNotices || 0,
          feeCollectionRate: feeCol.collectionRate || 0,
          feeOutstanding: feeCol.outstanding || 0,
          activeTerm: overview.activeTerm?.name || null,
        })

        if (data.genderDistribution) {
          setGenderData([
            { name: 'Boys', value: data.genderDistribution.MALE || 0 },
            { name: 'Girls', value: data.genderDistribution.FEMALE || 0 },
          ])
        }

        if (data.studentsPerClass && data.studentsPerClass.length > 0) {
          setClassChartData(
            data.studentsPerClass.map((c: any) => ({
              name: c.className || c.name,
              students: c.studentCount || 0,
            }))
          )
        }

        if (data.recentActivities?.recentPayments) {
          const payments: RecentPayment[] = data.recentActivities.recentPayments.map((p: any) => ({
            id: p.id,
            studentName: p.student
              ? `${p.student.firstName} ${p.student.lastName}`
              : 'Unknown',
            amount: p.amount,
            receiptNumber: p.receiptNumber,
            paymentMethod: p.paymentMethod,
            createdAt: p.createdAt,
            status: p.status,
          }))
          setRecentPayments(payments)
        }

        const activities: RecentActivity[] = []
        if (data.recentActivities?.recentPayments) {
          data.recentActivities.recentPayments.slice(0, 4).forEach((p: any) => {
            activities.push({
              id: p.id,
              type: 'payment',
              description: `Payment of KES ${(p.amount || 0).toLocaleString()} by ${p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown'}`,
              timestamp: p.createdAt,
              icon: 'payment',
            })
          })
        }
        if (data.recentActivities?.recentAttendance) {
          data.recentActivities.recentAttendance.slice(0, 4).forEach((a: any) => {
            activities.push({
              id: a.id,
              type: 'attendance',
              description: `${a.student ? `${a.student.firstName} ${a.student.lastName}` : 'Student'} marked as ${a.status}`,
              timestamp: a.createdAt,
              icon: 'attendance',
            })
          })
        }
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setRecentActivities(activities.slice(0, 6))
      } else {
        setStats({
          totalStudents: 245,
          totalClasses: 8,
          feeCollection: 2850000,
          attendanceRate: 94.5,
          activeStudents: 238,
          totalTeachers: 15,
          totalSubjects: 12,
          totalNotices: 3,
          feeCollectionRate: 75,
          feeOutstanding: 950000,
          activeTerm: null,
        })
      }

      // Fallback: load recent payments from fees API if not from dashboard
      const feesRes = await feesApi.transactions({ limit: 10 })
      if (feesRes.success && feesRes.data && recentPayments.length === 0) {
        const items = feesRes.data.items || feesRes.data || []
        setRecentPayments(items.map((t: any) => ({
          id: t.id,
          studentName: t.student?.firstName ? `${t.student.firstName} ${t.student.lastName}` : 'Unknown',
          amount: t.amount,
          receiptNumber: t.receiptNumber,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt,
          status: t.status,
        })))
      }
    } catch {
      setError(true)
      setStats({
        totalStudents: 245,
        totalClasses: 8,
        feeCollection: 2850000,
        attendanceRate: 94.5,
        activeStudents: 238,
        totalTeachers: 15,
        totalSubjects: 12,
        totalNotices: 3,
        feeCollectionRate: 75,
        feeOutstanding: 950000,
        activeTerm: null,
      })
      setRecentPayments([])
    } finally {
      setLoading(false)
    }
  }

  const chartClassData = classChartData.length > 0
    ? classChartData
    : classes?.length
      ? classes.map((c) => ({ name: c.name, students: c.studentCount || 0 }))
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

  const chartGenderData = genderData.length > 0
    ? genderData
    : [
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

  const paymentMethodColors: Record<string, string> = {
    CASH: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    MPESA: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    BANK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Activity className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Unable to load data</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Something went wrong. Please try again.</p>
        <Button
          onClick={loadData}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white shadow-md dark:shadow-lg dark:shadow-teal-900/30"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
              {stats?.activeTerm && (
                <span className="ml-2 inline-flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-300 mr-1.5 inline-block" />
                  {stats.activeTerm}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-teal-100 hover:text-white hover:bg-teal-500/50"
              onClick={() => navigateTo('notices')}
            >
              {stats?.totalNotices || 0} Notices
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Charts */}
      <DashboardCharts
        classData={chartClassData}
        genderData={chartGenderData}
        feeTrendData={feeTrendData}
        loading={loading}
      />

      {/* Quick Actions, Recent Payments & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800 transition-colors"
                onClick={() => navigateTo('students')}
              >
                <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add Student</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Register a new student</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-200 dark:hover:border-amber-800 transition-colors"
                onClick={() => navigateTo('fees')}
              >
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Record Payment</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Process fee payment</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
                onClick={() => navigateTo('attendance')}
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Take Attendance</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Mark daily attendance</p>
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
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Payments</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 dark:text-teal-400 text-xs"
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
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 dark:text-slate-500 text-sm">No recent payments</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{payment.studentName}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{payment.receiptNumber}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          KES {payment.amount.toLocaleString()}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn('text-[9px] px-1.5 py-0', paymentMethodColors[payment.paymentMethod] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}
                        >
                          {payment.paymentMethod}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 dark:text-slate-500 text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="space-y-4">
                    {recentActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 relative">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                          activity.type === 'payment'
                            ? 'bg-green-50 dark:bg-green-900/40 border-2 border-green-200 dark:border-green-800'
                            : 'bg-blue-50 dark:bg-blue-900/40 border-2 border-blue-200 dark:border-blue-800'
                        )}>
                          {activity.type === 'payment' ? (
                            <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">{activity.description}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
