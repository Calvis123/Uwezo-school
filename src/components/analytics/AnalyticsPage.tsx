'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ClipboardCheck,
  Trophy,
  BarChart3,
  GraduationCap,
  RefreshCw,
  CalendarDays,
  Target,
  Flame,
  UserCheck,
  PieChart,
  LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface AnalyticsData {
  summary: {
    totalRevenue: number
    totalStudents: number
    totalClasses: number
    activeClasses: number
    avgAttendanceRate: number
    topClass: { className: string; averageScore: number } | null
    projectedAnnual: number
    monthlyAverage: number
    growthRate: number
  }
  feeCollectionMonthly: { month: string; collected: number; transactions: number }[]
  attendanceTrends: { month: string; rate: number; total: number; present: number }[]
  classPerformance: { className: string; averageScore: number }[]
  genderDistribution: { className: string; classId: string; male: number; female: number; total: number }[]
  topStudents: { name: string; averageScore: number; classId: string; className: string }[]
  bottomStudents: { name: string; averageScore: number; classId: string; className: string }[]
  feeDefaulters: { name: string; classId: string; totalRequired: number; totalPaid: number }[]
  classSummary: { className: string; classId: string; students: number; capacity: number; averageScore: number; attendanceRate: number }[]
  enrollmentByLevel: { level: string; count: number; male: number; female: number }[]
  feeByClass: { className: string; classId: string; totalRequired: number; totalPaid: number; outstanding: number; collectionRate: number; transactionCount: number }[]
  attendanceByClass: { className: string; classId: string; rate: number; total: number; present: number }[]
}

// ==================== Main Component ====================

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dateRange, setDateRange] = useState('all_time')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams()
      if (dateRange === 'this_year') {
        const now = new Date()
        params.set('from', `${now.getFullYear()}-01-01`)
        params.set('to', `${now.getFullYear()}-12-31`)
      } else if (dateRange === 'last_year') {
        const now = new Date()
        params.set('from', `${now.getFullYear() - 1}-01-01`)
        params.set('to', `${now.getFullYear() - 1}-12-31`)
      }
      // 'all_time' — don't set from/to, API returns all data

      const res = await fetch(`/api/analytics?${params.toString()}`)
      const result = await res.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleExportCSV = () => {
    if (!data) return
    try {
      let csv = 'Class Summary\n'
      csv += 'Class,Students,Capacity,Avg Score,Attendance Rate\n'
      data.classSummary.forEach(c => {
        csv += `"${c.className}",${c.students},${c.capacity},${c.averageScore},${c.attendanceRate}%\n`
      })
      csv += '\nTop Students\n'
      csv += 'Name,Average Score\n'
      data.topStudents.forEach(s => {
        csv += `"${s.name}",${s.averageScore}\n`
      })
      csv += '\nFee Defaulters (>50% Outstanding)\n'
      csv += 'Name,Total Required,Total Paid,Outstanding\n'
      data.feeDefaulters.forEach(f => {
        csv += `"${f.name}",${f.totalRequired},${f.totalPaid},${Math.round(f.totalRequired - f.totalPaid)}\n`
      })

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch {
      toast.error('Failed to export report')
    }
  }

  // ==================== Error / Loading States ====================

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Unable to load analytics</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Something went wrong. Please try again.</p>
        <Button variant="outline" className="gap-2" onClick={loadData}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  const maxEnrollment = data && data.enrollmentByLevel.length > 0
    ? Math.max(...data.enrollmentByLevel.map(e => e.count))
    : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Analytics &amp; Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comprehensive school performance insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={handleExportCSV}
            disabled={loading}
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
                  <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  KES {(data.summary.totalRevenue / 1000).toFixed(0)}K
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {data.summary.growthRate >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={cn('text-xs font-medium', data.summary.growthRate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {data.summary.growthRate >= 0 ? '+' : ''}{data.summary.growthRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">growth</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Attendance</p>
                  <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {data.summary.avgAttendanceRate}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn(
                    'text-xs font-medium',
                    data.summary.avgAttendanceRate >= 90
                      ? 'text-green-600 dark:text-green-400'
                      : data.summary.avgAttendanceRate >= 75
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  )}>
                    {data.summary.avgAttendanceRate >= 90 ? 'Excellent' : data.summary.avgAttendanceRate >= 75 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Top Class</p>
                  <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {data.summary.topClass?.className || 'N/A'}
                </p>
                {data.summary.topClass && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                    Avg Score: {data.summary.topClass.averageScore}%
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Revenue Projection</p>
                  <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  KES {(data.summary.projectedAnnual / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Projected annual</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : null}

      {/* ==================== Student Enrollment by Level ==================== */}
      {loading ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4"><Skeleton className="h-52 w-full" /></CardContent>
        </Card>
      ) : data && data.enrollmentByLevel.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  Student Enrollment by Level
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {data.enrollmentByLevel.reduce((s, e) => s + e.count, 0)} total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.enrollmentByLevel.map((entry, i) => {
                  const pct = maxEnrollment > 0 ? (entry.count / maxEnrollment) * 100 : 0
                  const barColors = [
                    'bg-teal-500 dark:bg-teal-400',
                    'bg-emerald-500 dark:bg-emerald-400',
                    'bg-amber-500 dark:bg-amber-400',
                    'bg-orange-500 dark:bg-orange-400',
                    'bg-sky-500 dark:bg-sky-400',
                  ]
                  return (
                    <div key={entry.level} className="flex items-center gap-3">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 w-44 flex-shrink-0 truncate">{entry.level}</p>
                      <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-700/50 rounded-lg overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          className={cn('h-full rounded-lg', barColors[i % barColors.length])}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-28 justify-end">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{entry.count}</span>
                        <div className="flex items-center gap-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                          <span className="text-sky-500">♂{entry.male}</span>
                          <span className="text-pink-500">♀{entry.female}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* ==================== Fee Collection by Class ==================== */}
      {loading ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4"><Skeleton className="h-52 w-full" /></CardContent>
        </Card>
      ) : data && data.feeByClass.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Fee Collection by Class
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {data.feeByClass.length} classes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs text-right">Required</TableHead>
                      <TableHead className="text-xs text-right">Collected</TableHead>
                      <TableHead className="text-xs text-right">Outstanding</TableHead>
                      <TableHead className="text-xs min-w-[120px]">Collection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.feeByClass.slice(0, 15).map((fc) => (
                      <TableRow key={fc.classId}>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {fc.className}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                          KES {fc.totalRequired.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-slate-900 dark:text-slate-100 font-medium">
                          KES {fc.totalPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          <span className={cn(
                            'font-medium',
                            fc.outstanding === 0
                              ? 'text-green-600 dark:text-green-400'
                              : fc.collectionRate >= 70
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          )}>
                            KES {fc.outstanding.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={fc.collectionRate} className="h-2 flex-1 [&>div]:bg-teal-500" />
                            <span className={cn(
                              'text-xs font-semibold tabular-nums w-10 text-right',
                              fc.collectionRate >= 90
                                ? 'text-green-600 dark:text-green-400'
                                : fc.collectionRate >= 70
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                            )}>
                              {fc.collectionRate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* ==================== Attendance Heatmap by Class ==================== */}
      {loading ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4"><Skeleton className="h-52 w-full" /></CardContent>
        </Card>
      ) : data && data.attendanceByClass.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                    <LayoutGrid className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </div>
                  Attendance Rate by Class
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">&gt;90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">70-90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">&lt;70%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {data.attendanceByClass.map((ac) => {
                  const bgColor = ac.rate >= 90
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
                    : ac.rate >= 70
                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
                  const textColor = ac.rate >= 90
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : ac.rate >= 70
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-red-700 dark:text-red-300'
                  const dotColor = ac.rate >= 90 ? 'bg-emerald-500' : ac.rate >= 70 ? 'bg-amber-400' : 'bg-red-400'

                  return (
                    <div
                      key={ac.classId}
                      className={cn(
                        'p-3 rounded-xl border transition-all hover:shadow-sm cursor-default',
                        bgColor
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{ac.className}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className={cn('text-lg font-bold tabular-nums', textColor)}>{ac.rate}%</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {ac.present}/{ac.total}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-slate-200/60 dark:bg-slate-700/40 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            ac.rate >= 90 ? 'bg-emerald-500' : ac.rate >= 70 ? 'bg-amber-400' : 'bg-red-400'
                          )}
                          style={{ width: `${ac.rate}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* ==================== Top Performers & Gender Distribution ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Students */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
            </CardContent>
          </Card>
        ) : data && data.topStudents.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Top 10 Students
                  <Badge variant="secondary" className="ml-auto text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <Flame className="w-3 h-3 mr-0.5" />
                    Top performers
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-xs w-8">#</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topStudents.map((student, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono text-slate-400">
                            {i < 3 ? (
                              <span className={cn(
                                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-600'
                              )}>
                                {i + 1}
                              </span>
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-slate-900 dark:text-slate-100">{student.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{student.className}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              className={cn(
                                'text-xs font-medium',
                                student.averageScore >= 80
                                  ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                  : student.averageScore >= 60
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              )}
                            >
                              {student.averageScore}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Gender Distribution by Class */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
            </CardContent>
          </Card>
        ) : data && data.genderDistribution.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-pink-50 dark:bg-pink-900/40 flex items-center justify-center">
                    <PieChart className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
                  </div>
                  Gender Distribution by Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-xs">Class</TableHead>
                        <TableHead className="text-xs text-center">Total</TableHead>
                        <TableHead className="text-xs">Gender Split</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.genderDistribution.map((gd, i) => {
                        const malePct = gd.total > 0 ? Math.round((gd.male / gd.total) * 100) : 50
                        const femalePct = 100 - malePct
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {gd.className}
                            </TableCell>
                            <TableCell className="text-center text-sm tabular-nums text-slate-700 dark:text-slate-300">
                              {gd.total}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-sky-600 dark:text-sky-400 w-6">♂{gd.male}</span>
                                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-sky-500 dark:bg-sky-400" style={{ width: `${malePct}%` }} />
                                  <div className="h-full bg-pink-500 dark:bg-pink-400" style={{ width: `${femalePct}%` }} />
                                </div>
                                <span className="text-[10px] text-pink-600 dark:text-pink-400 w-6 text-right">♀{gd.female}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>

      {/* ==================== Fee Defaulters ==================== */}
      {loading ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40 mb-4" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
          </CardContent>
        </Card>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/40 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                </div>
                Fee Defaulters (&gt;50% Outstanding)
                <Badge variant="secondary" className="ml-auto text-xs">{data.feeDefaulters.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                {data.feeDefaulters.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-8 h-8 text-green-300 dark:text-green-700 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No fee defaulters!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.feeDefaulters.map((defaulter, i) => {
                        const outstanding = Math.round(defaulter.totalRequired - defaulter.totalPaid)
                        const pct = defaulter.totalRequired > 0 ? Math.round((outstanding / defaulter.totalRequired) * 100) : 0
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-sm text-slate-900 dark:text-slate-100">
                              {defaulter.name || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
                                  KES {outstanding.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {pct}% outstanding
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {/* Class Summary Table */}
      {loading ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40 mb-4" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
          </CardContent>
        </Card>
      ) : data && data.classSummary.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                Class Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs text-center">Students</TableHead>
                      <TableHead className="text-xs text-center">Capacity</TableHead>
                      <TableHead className="text-xs text-center">Avg Score</TableHead>
                      <TableHead className="text-xs text-center">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.classSummary.map((cls, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {cls.className}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums text-slate-700 dark:text-slate-300">
                          {cls.students}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums text-slate-500 dark:text-slate-400">
                          {cls.capacity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={cn(
                              'text-xs font-medium',
                              cls.averageScore >= 80
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : cls.averageScore >= 60
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            )}
                          >
                            {cls.averageScore > 0 ? `${cls.averageScore}%` : '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">
                          <span className={cn(
                            'font-medium',
                            cls.attendanceRate >= 90
                              ? 'text-green-600 dark:text-green-400'
                              : cls.attendanceRate >= 75
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                          )}>
                            {cls.attendanceRate > 0 ? `${cls.attendanceRate}%` : '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </div>
  )
}
