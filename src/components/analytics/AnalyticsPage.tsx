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
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
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
  topStudents: { name: string; averageScore: number; classId: string }[]
  bottomStudents: { name: string; averageScore: number; classId: string }[]
  feeDefaulters: { name: string; classId: string; totalRequired: number; totalPaid: number }[]
  classSummary: { className: string; classId: string; students: number; capacity: number; averageScore: number; attendanceRate: number }[]
}

const CHART_COLORS = [
  '#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#e11d48',
]

// ==================== Main Component ====================

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dateRange, setDateRange] = useState('this_year')

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Analytics & Reports</h2>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Chart */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ) : data && data.feeCollectionMonthly.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Fee Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.feeCollectionMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Collected']}
                    />
                    <Bar dataKey="collected" radius={[4, 4, 0, 0]}>
                      {data.feeCollectionMonthly.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Attendance Trends Chart */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ) : data && data.attendanceTrends.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Rate']}
                    />
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill="url(#attendanceGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Class Performance Chart */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ) : data && data.classPerformance.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Class Performance (Avg Score)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, data.classPerformance.length * 32)}>
                  <BarChart data={data.classPerformance} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="className"
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Avg Score']}
                    />
                    <Bar dataKey="averageScore" radius={[0, 4, 4, 0]}>
                      {data.classPerformance.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Gender Distribution */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              <Skeleton className="h-52 w-full" />
            </CardContent>
          </Card>
        ) : data && data.genderDistribution.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Gender Distribution by Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, data.genderDistribution.length * 32)}>
                  <BarChart data={data.genderDistribution} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color, #e2e8f0)" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="className"
                      tick={{ fontSize: 11, fill: 'var(--tick-color, #64748b)' }}
                      axisLine={{ stroke: 'var(--axis-color, #e2e8f0)' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        border: '1px solid var(--tooltip-border, #e2e8f0)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="male" stackId="a" fill="#0ea5e9" name="Male" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="female" stackId="a" fill="#ec4899" name="Female" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students */}
        {loading ? (
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <Skeleton className="h-5 w-40 mb-4" />
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
            </CardContent>
          </Card>
        ) : data && data.topStudents.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Top 10 Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs text-right">Avg Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topStudents.map((student, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono text-slate-400 w-8">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-sm text-slate-900 dark:text-slate-100">
                            {student.name}
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

        {/* Fee Defaulters */}
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
                  <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
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
      </div>

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
                <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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
