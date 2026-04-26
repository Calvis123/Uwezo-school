'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  FileText,
  Phone,
  CreditCard,
  RefreshCw,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  BookOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { parentApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// ---- Types ----

interface ChildSummary {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  status: string
  relationship: string
  class: { id: string; name: string; level: string; stream: string | null } | null
  fees: { totalFees: number; totalPaid: number; balance: number }
  attendance: { rate: number }
  recentExam: {
    id: string
    name: string
    type: string
    avgScore: number | null
    grade: string | null
    subjectsCount: number
  } | null
}

interface FeeLedgerData {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string; class: { id: string; name: string } | null }
  totalFees: number
  totalPaid: number
  balance: number
  termBreakdown: {
    termId: string
    termName: string
    year: number
    label: string
    totalFees: number
    totalPaid: number
    balance: number
    structures: { id: string; name: string; category: string; amount: number }[]
    payments: { id: string; amount: number; paymentMethod: string; receiptNumber: string; status: string; date: string; feeName: string }[]
  }[]
  recentPayments: { id: string; amount: number; paymentMethod: string; receiptNumber: string; status: string; date: string; feeName: string }[]
}

interface DashboardData {
  guardian: { id: string; name: string; email: string; phone: string | null; role: string }
  childrenSummary: ChildSummary[]
  feeOverview: { totalFeesDue: number; totalFeesPaid: number; totalFeesBalance: number; collectionRate: number }
  attendanceOverview: { averageRate: number; perChild: { studentId: string; firstName: string; lastName: string; records: { date: string; status: string }[] }[] }
  activeTerm: { id: string; name: string; year: number; status: string } | null
  upcomingEvents: { id: string; title: string; content: string; category: string; publishedAt: string }[]
  recentNotices: { id: string; title: string; content: string; category: string; publishedAt: string }[]
}

interface ParentResultsData {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string; class: { id: string; name: string } | null }
  results: {
    examId: string
    examName: string
    examType: string
    termLabel: string
    className: string
    startDate: string | null
    endDate: string | null
    subjects: { subjectId: string; subjectName: string; marks: number; grade: string | null; remarks: string | null }[]
    totalMarks: number
    average: number
  }[]
  resultsByTerm: Record<string, any[]>
  summary: { totalExams: number; overallAverage: number; totalSubjects: number }
}

// ---- Helpers ----

function getAttendanceColor(rate: number): string {
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getAttendanceBg(rate: number): string {
  if (rate >= 90) return 'bg-emerald-100 dark:bg-emerald-900/40'
  if (rate >= 70) return 'bg-amber-100 dark:bg-amber-900/40'
  return 'bg-red-100 dark:bg-red-900/40'
}

function getAttendanceProgressColor(rate: number): string {
  if (rate >= 90) return '[&>div]:bg-emerald-500'
  if (rate >= 70) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-red-500'
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'ACADEMIC': return BookOpen
    case 'EVENTS': return Calendar
    case 'URGENT': return AlertCircle
    default: return FileText
  }
}

function getCategoryBadgeStyle(category: string) {
  switch (category) {
    case 'ACADEMIC': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'EVENTS': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    case 'URGENT': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }
}

const paymentMethodColors: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  MPESA: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  BANK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

const gradeColorMap: Record<string, string> = {
  'A': 'text-emerald-600 dark:text-emerald-400',
  'B': 'text-blue-600 dark:text-blue-400',
  'C': 'text-amber-600 dark:text-amber-400',
  'D': 'text-orange-600 dark:text-orange-400',
  'E': 'text-red-600 dark:text-red-400',
  'EE': 'text-emerald-600 dark:text-emerald-400',
  'ME': 'text-blue-600 dark:text-blue-400',
  'AE': 'text-amber-600 dark:text-amber-400',
  'BE': 'text-red-600 dark:text-red-400',
  '1': 'text-emerald-600 dark:text-emerald-400',
  '2': 'text-blue-600 dark:text-blue-400',
  '3': 'text-amber-600 dark:text-amber-400',
  '4': 'text-red-600 dark:text-red-400',
}

// ---- Component ----

export function ParentDashboard() {
  const { user, navigateTo } = useAppStore()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [children, setChildren] = useState<ChildSummary[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [feeLedger, setFeeLedger] = useState<FeeLedgerData | null>(null)
  const [resultsByChild, setResultsByChild] = useState<Record<string, ParentResultsData | null>>({})
  const [resultsLoading, setResultsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feeLoading, setFeeLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
    }
  }, [user?.id])

  useEffect(() => {
    if (selectedChildId) {
      loadFeeLedger(selectedChildId)
    }
  }, [selectedChildId])

  useEffect(() => {
    if (activeTab === 'results' && selectedChildId) {
      void loadResults(selectedChildId)
    }
  }, [activeTab, selectedChildId])

  const loadDashboard = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(false)
    try {
      const [dashRes, childrenRes] = await Promise.all([
        parentApi.dashboard(),
        parentApi.children(),
      ])

      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data)
        const childrenData = dashRes.data.childrenSummary || []
        setChildren(childrenData)
        if (childrenData.length > 0 && !selectedChildId) {
          setSelectedChildId(childrenData[0].id)
        }
      }

      if (childrenRes.success && childrenRes.data && childrenRes.data.length > 0) {
        setChildren(childrenRes.data)
        if (!selectedChildId) {
          setSelectedChildId(childrenRes.data[0].id)
        }
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadFeeLedger = async (studentId: string) => {
    setFeeLoading(true)
    try {
      const res = await parentApi.feeLedger(studentId)
      if (res.success && res.data) {
        setFeeLedger(res.data)
      }
    } catch {
      setFeeLedger(null)
    } finally {
      setFeeLoading(false)
    }
  }

  const loadResults = async (studentId: string) => {
    const hasCached = Object.prototype.hasOwnProperty.call(resultsByChild, studentId)
    if (hasCached) return
    setResultsLoading(true)
    try {
      const res = await parentApi.results(studentId)
      if (res.success && res.data) {
        setResultsByChild((prev) => ({ ...prev, [studentId]: res.data as any }))
      } else {
        setResultsByChild((prev) => ({ ...prev, [studentId]: null }))
      }
    } catch {
      setResultsByChild((prev) => ({ ...prev, [studentId]: null }))
    } finally {
      setResultsLoading(false)
    }
  }

  const refreshResults = async (studentId: string) => {
    setResultsByChild((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
    await loadResults(studentId)
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)

  // ---- Loading State ----

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome skeleton */}
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // ---- Error State ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Unable to load dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Something went wrong. Please try again.</p>
        <Button onClick={loadDashboard} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!dashboardData || children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Children Linked</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Your account is not linked to any students. Please contact the school administration.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---- Welcome Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 text-white shadow-md dark:shadow-lg dark:shadow-teal-900/30"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-white/30">
              <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">
                Welcome, {user?.name?.split(' ')[0] || 'Parent'}!
              </h2>
              <p className="text-teal-100 text-sm mt-1">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
                {dashboardData.activeTerm && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 mr-1.5 inline-block" />
                    {dashboardData.activeTerm.year} {dashboardData.activeTerm.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {children.length} {children.length === 1 ? 'Child' : 'Children'}
            </Badge>
            {user?.phone && (
              <Badge className="bg-white/20 text-white border-0 text-xs">
                <Phone className="w-3 h-3 mr-1" />
                {user.phone}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* ---- Children Selector ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {children.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 min-w-[200px] flex-shrink-0',
                selectedChildId === child.id
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 shadow-md'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
              )}
            >
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                child.gender === 'MALE'
                  ? 'bg-blue-100 dark:bg-blue-900/40'
                  : 'bg-pink-100 dark:bg-pink-900/40'
              )}>
                <Users className={cn(
                  'w-4 h-4',
                  child.gender === 'MALE'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-pink-600 dark:text-pink-400'
                )} />
              </div>
              <div className="text-left">
                <p className={cn(
                  'text-sm font-semibold',
                  selectedChildId === child.id
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-700 dark:text-slate-200'
                )}>
                  {child.firstName} {child.lastName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {child.class?.name || 'No Class'} · {child.relationship}
                </p>
              </div>
              {selectedChildId === child.id && (
                <ChevronRight className="w-4 h-4 text-teal-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ---- Per-Child Summary Cards ---- */}
      {selectedChild && (
        <motion.div
          key={selectedChild.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Class & Stream */}
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Class & Stream</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedChild.class?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ADM: {selectedChild.admissionNumber}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fees */}
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fee Balance</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    KES {selectedChild.fees.balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Outstanding
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Paid: KES {selectedChild.fees.totalPaid.toLocaleString()}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Total: KES {selectedChild.fees.totalFees.toLocaleString()}
                </span>
              </div>
              <Progress
                value={selectedChild.fees.totalFees > 0 ? (selectedChild.fees.totalPaid / selectedChild.fees.totalFees) * 100 : 0}
                className="mt-2 h-1.5 [&>div]:bg-teal-500"
              />
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', getAttendanceBg(selectedChild.attendance.rate))}>
                  <ClipboardCheck className={cn('w-5 h-5', getAttendanceColor(selectedChild.attendance.rate))} />
                </div>
                <div>
                  <p className={cn('text-lg font-bold', getAttendanceColor(selectedChild.attendance.rate))}>
                    {selectedChild.attendance.rate}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This term
                  </p>
                </div>
              </div>
              <Progress
                value={selectedChild.attendance.rate}
                className={cn('h-1.5', getAttendanceProgressColor(selectedChild.attendance.rate))}
              />
            </CardContent>
          </Card>

          {/* Recent Exam Results */}
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Recent Exam</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              {selectedChild.recentExam ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {selectedChild.recentExam.avgScore ?? '—'}%
                      </p>
                      {selectedChild.recentExam.grade && (
                        <span className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded',
                          gradeColorMap[selectedChild.recentExam.grade] || 'text-slate-600',
                          getAttendanceBg(selectedChild.recentExam.avgScore || 0)
                        )}>
                          {selectedChild.recentExam.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                      {selectedChild.recentExam.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">No results yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Awaiting exams</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ---- Detail Tabs ---- */}
      {selectedChild && (
        <motion.div
          key={`tabs-${selectedChild.id}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="fees"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"
              >
                Fee Details
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"
              >
                Attendance
              </TabsTrigger>
              <TabsTrigger
                value="results"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"
              >
                Results
              </TabsTrigger>
              <TabsTrigger
                value="notices"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm"
              >
                Notices
              </TabsTrigger>
            </TabsList>

            {/* ---- Overview Tab ---- */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Quick Actions */}
              <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 justify-start gap-3 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800"
                    onClick={() => setActiveTab('fees')}
                  >
                    <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Pay Fees</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">View & pay outstanding</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 justify-start gap-3 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-800"
                    onClick={() => navigateTo('messages')}
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Contact Teacher</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Send a message</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 justify-start gap-3 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-200 dark:hover:border-emerald-800"
                    onClick={() => setActiveTab('results')}
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">View Report Card</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Exam results & grades</p>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Notices + All Children Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Notices */}
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-fit">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Notices</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-teal-600 dark:text-teal-400 text-xs"
                        onClick={() => setActiveTab('notices')}
                      >
                        View All <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.recentNotices.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 dark:text-slate-500 text-sm">No recent notices</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.recentNotices.map((notice) => {
                          const Icon = getCategoryIcon(notice.category)
                          return (
                            <div
                              key={notice.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {notice.title}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className={cn('text-[9px] px-1.5 py-0 flex-shrink-0', getCategoryBadgeStyle(notice.category))}
                                  >
                                    {notice.category}
                                  </Badge>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {notice.content}
                                </p>
                                {notice.publishedAt && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* All Children Summary */}
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      All Children Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChildId(child.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                            selectedChildId === child.id
                              ? 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/20'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-700/30'
                          )}
                        >
                          <div className={cn(
                            'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
                            child.gender === 'MALE'
                              ? 'bg-blue-100 dark:bg-blue-900/40'
                              : 'bg-pink-100 dark:bg-pink-900/40'
                          )}>
                            <span className={cn(
                              'text-xs font-bold',
                              child.gender === 'MALE'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-pink-600 dark:text-pink-400'
                            )}>
                              {child.firstName[0]}{child.lastName[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {child.firstName} {child.lastName}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {child.class?.name || 'No Class'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={cn('text-sm font-semibold', getAttendanceColor(child.attendance.rate))}>
                              {child.attendance.rate}%
                            </p>
                            <p className="text-[10px] text-slate-400">Attendance</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={cn(
                              'text-sm font-semibold',
                              child.fees.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            )}>
                              KES {child.fees.balance.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">Balance</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Overall Fee Summary */}
                    {dashboardData.feeOverview && (
                      <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>Total Fees Paid</span>
                          <span>{dashboardData.feeOverview.collectionRate}%</span>
                        </div>
                        <Progress
                          value={dashboardData.feeOverview.collectionRate}
                          className="h-2 [&>div]:bg-teal-500 mb-2"
                        />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Paid: <span className="font-medium text-emerald-600 dark:text-emerald-400">KES {dashboardData.feeOverview.totalFeesPaid.toLocaleString()}</span>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Due: <span className="font-medium text-red-600 dark:text-red-400">KES {dashboardData.feeOverview.totalFeesBalance.toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ---- Results Tab ---- */}
            <TabsContent value="results" className="mt-4 space-y-6">
              <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exam Results</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-2"
                      onClick={() => selectedChildId && refreshResults(selectedChildId)}
                      disabled={!selectedChildId || resultsLoading}
                    >
                      <RefreshCw className={cn('w-3.5 h-3.5', resultsLoading ? 'animate-spin' : '')} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {resultsLoading && !resultsByChild[selectedChild.id] ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  ) : (resultsByChild[selectedChild.id]?.results?.length || 0) === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No results available</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Results will appear here once marks are entered.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Exams</p>
                          <div className="space-y-2">
                            {(resultsByChild[selectedChild.id]?.results || []).slice(0, 10).map((exam) => (
                              <div key={exam.examId} className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/20">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{exam.examName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{exam.termLabel}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{exam.average}%</p>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{exam.subjects.length} subjects</p>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <Progress value={Math.min(100, Math.max(0, exam.average))} className={cn('h-2', getAttendanceProgressColor(exam.average))} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Latest Exam Breakdown</p>
                          {(() => {
                            const latest = (resultsByChild[selectedChild.id]?.results || [])[0]
                            if (!latest) return null
                            return (
                              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                                <div className="p-3 bg-white dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/60">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{latest.examName}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{latest.termLabel}</p>
                                </div>
                                <div className="p-3 bg-slate-50/60 dark:bg-slate-900/20">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead className="text-right">Marks</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {latest.subjects
                                        .slice()
                                        .sort((a, b) => b.marks - a.marks)
                                        .map((s) => (
                                          <TableRow key={s.subjectId}>
                                            <TableCell className="font-medium">{s.subjectName}</TableCell>
                                            <TableCell className="text-right tabular-nums">
                                              <span className={cn('font-semibold', s.grade ? (gradeColorMap[s.grade] || '') : '')}>
                                                {s.marks}
                                              </span>
                                              {s.grade ? <span className="ml-2 text-xs text-slate-400">({s.grade})</span> : null}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Fee Details Tab ---- */}
            <TabsContent value="fees" className="mt-4 space-y-6">
              {feeLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 rounded-xl" />
                </div>
              ) : feeLedger ? (
                <>
                  {/* Fee Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Fees</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                          KES {feeLedger.totalFees.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Paid</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          KES {feeLedger.totalPaid.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Outstanding Balance</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                          KES {feeLedger.balance.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Term-by-term Breakdown */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Fee Breakdown by Term
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {feeLedger.termBreakdown.length === 0 ? (
                        <div className="text-center py-8">
                          <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400 dark:text-slate-500 text-sm">No fee structures found</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {feeLedger.termBreakdown.map((term) => (
                            <div key={term.termId} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {term.label}
                                  </span>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px]',
                                    term.balance <= 0
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                  )}
                                >
                                  {term.balance <= 0 ? 'CLEARED' : `DUE: KES ${term.balance.toLocaleString()}`}
                                </Badge>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">Fee Item</TableHead>
                                    <TableHead className="text-xs text-right">Amount</TableHead>
                                    <TableHead className="text-xs text-right">Paid</TableHead>
                                    <TableHead className="text-xs text-right">Balance</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {term.structures.map((fs) => {
                                    const paidForThis = term.payments
                                      .filter((p) => p.feeName === fs.name)
                                      .reduce((s, p) => s + p.amount, 0)
                                    return (
                                      <TableRow key={fs.id}>
                                        <TableCell className="text-sm py-2">{fs.name}</TableCell>
                                        <TableCell className="text-sm text-right py-2">
                                          KES {fs.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm text-right text-emerald-600 dark:text-emerald-400 py-2">
                                          KES {paidForThis.toLocaleString()}
                                        </TableCell>
                                        <TableCell className={cn(
                                          'text-sm text-right font-medium py-2',
                                          fs.amount - paidForThis > 0
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-emerald-600 dark:text-emerald-400'
                                        )}>
                                          KES {(fs.amount - paidForThis).toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                  <TableRow className="bg-slate-50/50 dark:bg-slate-700/20 font-semibold">
                                    <TableCell className="text-sm py-2">Total</TableCell>
                                    <TableCell className="text-sm text-right py-2">
                                      KES {term.totalFees.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-sm text-right text-emerald-600 dark:text-emerald-400 py-2">
                                      KES {term.totalPaid.toLocaleString()}
                                    </TableCell>
                                    <TableCell className={cn(
                                      'text-sm text-right py-2',
                                      term.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                                    )}>
                                      KES {term.balance.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Payments */}
                  {feeLedger.recentPayments.length > 0 && (
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Recent Payments
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {feeLedger.recentPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{payment.feeName}</p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {format(new Date(payment.date), 'MMM d, yyyy')} · {payment.receiptNumber}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  KES {payment.amount.toLocaleString()}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[9px] px-1.5 py-0', paymentMethodColors[payment.paymentMethod] || '')}
                                >
                                  {payment.paymentMethod}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No fee data available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ---- Attendance Tab ---- */}
            <TabsContent value="attendance" className="mt-4 space-y-6">
              {selectedChild && (
                <>
                  {/* Attendance Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Attendance Rate</p>
                            <p className={cn('text-xl font-bold', getAttendanceColor(selectedChild.attendance.rate))}>
                              {selectedChild.attendance.rate}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Class</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {selectedChild.class?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                      <CardContent className="pt-4 pb-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Term</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {dashboardData.activeTerm ? `${dashboardData.activeTerm.year} ${dashboardData.activeTerm.name}` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attendance Calendar */}
                  <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Attendance Calendar - {format(new Date(), 'MMMM yyyy')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const childAttendance = dashboardData.attendanceOverview.perChild.find(
                          (c) => c.studentId === selectedChild.id
                        )
                        const records = childAttendance?.records || []

                        // Build a calendar grid for this month
                        const now = new Date()
                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
                        const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay()

                        // Build a map of date -> status
                        const statusMap = new Map<string, string>()
                        records.forEach((r) => {
                          const dateStr = format(new Date(r.date), 'yyyy-MM-dd')
                          statusMap.set(dateStr, r.status)
                        })

                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        const calendarDays: (number | null)[] = []
                        for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
                        for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

                        // Count stats
                        const presentCount = records.filter((r) => r.status === 'PRESENT').length
                        const absentCount = records.filter((r) => r.status === 'ABSENT').length
                        const lateCount = records.filter((r) => r.status === 'LATE').length
                        const excusedCount = records.filter((r) => r.status === 'EXCUSED').length

                        // Daily / Weekly / Monthly summaries
                        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
                        const weekStart = new Date(todayStart)
                        const mondayOffset = (todayStart.getDay() + 6) % 7
                        weekStart.setDate(todayStart.getDate() - mondayOffset)

                        const normalize = (d: string) => new Date(d)
                        const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end
                        const consideredPresent = (status: string) => status === 'PRESENT' || status === 'LATE'

                        const todayRecords = records.filter((r) => inRange(normalize(r.date), todayStart, todayEnd))
                        const weekRecords = records.filter((r) => inRange(normalize(r.date), weekStart, todayEnd))
                        const monthRecords = records.filter((r) =>
                          normalize(r.date).getFullYear() === now.getFullYear() &&
                          normalize(r.date).getMonth() === now.getMonth()
                        )

                        const toRate = (items: typeof records) =>
                          items.length > 0
                            ? Math.round((items.filter((r) => consideredPresent(r.status)).length / items.length) * 100)
                            : 0

                        const todayRate = toRate(todayRecords)
                        const weekRate = toRate(weekRecords)
                        const monthRate = toRate(monthRecords)
                        const todayStatus =
                          todayRecords[0]?.status || 'NO RECORD'

                        return (
                          <div>
                            {/* Daily / Weekly / Monthly Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-900/20">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Daily</p>
                                <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                                  {todayStatus}
                                </p>
                                <p className={cn('text-xs mt-1', getAttendanceColor(todayRate))}>
                                  {todayRecords.length > 0 ? `${todayRate}% attendance today` : 'No attendance marked today'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-900/20">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Weekly</p>
                                <p className={cn('text-base font-bold mt-1', getAttendanceColor(weekRate))}>
                                  {weekRate}%
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {weekRecords.length} recorded day{weekRecords.length === 1 ? '' : 's'} this week
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/60 dark:bg-slate-900/20">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Monthly</p>
                                <p className={cn('text-base font-bold mt-1', getAttendanceColor(monthRate))}>
                                  {monthRate}%
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {monthRecords.length} recorded day{monthRecords.length === 1 ? '' : 's'} this month
                                </p>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex flex-wrap items-center gap-2.5 mb-4 text-xs">
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                <span className="text-slate-600 dark:text-slate-400">Present ({presentCount})</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30">
                                <div className="h-3 w-3 rounded-full bg-amber-500" />
                                <span className="text-slate-600 dark:text-slate-400">Late ({lateCount})</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/30">
                                <div className="h-3 w-3 rounded-full bg-red-500" />
                                <span className="text-slate-600 dark:text-slate-400">Absent ({absentCount})</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30">
                                <div className="h-3 w-3 rounded-full bg-blue-500" />
                                <span className="text-slate-600 dark:text-slate-400">Excused ({excusedCount})</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50">
                                <div className="h-3 w-3 rounded-full bg-slate-400 dark:bg-slate-500" />
                                <span className="text-slate-600 dark:text-slate-400">No Data</span>
                              </div>
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                              {days.map((d) => (
                                <div key={d} className="text-center text-[10px] font-medium text-slate-500 dark:text-slate-400 py-1">
                                  {d}
                                </div>
                              ))}
                              {calendarDays.map((day, idx) => {
                                if (day === null) {
                                  return <div key={`empty-${idx}`} className="h-9" />
                                }
                                const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                const status = statusMap.get(dateStr)
                                const dayOfWeek = new Date(now.getFullYear(), now.getMonth(), day).getDay()
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                                const isFuture = day > now.getDate()
                                const isToday = day === now.getDate()

                                let dotColor = 'bg-slate-400 dark:bg-slate-500'
                                let cellBg = ''
                                if (status === 'PRESENT') dotColor = 'bg-emerald-500'
                                else if (status === 'ABSENT') dotColor = 'bg-red-500'
                                else if (status === 'LATE') dotColor = 'bg-amber-500'
                                else if (status === 'EXCUSED') dotColor = 'bg-blue-500'

                                if (status === 'PRESENT') cellBg = 'bg-emerald-50 dark:bg-emerald-900/20'
                                else if (status === 'ABSENT') cellBg = 'bg-red-50 dark:bg-red-900/20'
                                else if (status === 'LATE') cellBg = 'bg-amber-50 dark:bg-amber-900/20'
                                else if (status === 'EXCUSED') cellBg = 'bg-blue-50 dark:bg-blue-900/20'
                                else if (isWeekend || isFuture) cellBg = 'bg-slate-50/80 dark:bg-slate-900/30'

                                return (
                                  <div
                                    key={day}
                                    className={cn(
                                      'h-9 rounded-md flex flex-col items-center justify-center gap-0.5 border border-transparent transition-colors',
                                      cellBg,
                                      isToday && 'ring-1 ring-teal-500 ring-offset-1 dark:ring-offset-slate-800'
                                    )}
                                  >
                                    <span className={cn(
                                      'text-[10px] font-medium',
                                      isWeekend || isFuture ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
                                    )}>
                                      {day}
                                    </span>
                                    <div className={cn('h-2.5 w-2.5 rounded-full shadow-sm', dotColor)} />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ---- Notices Tab ---- */}
            <TabsContent value="notices" className="mt-4">
              <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    School Notices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData.recentNotices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 dark:text-slate-500 text-sm">No notices available</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {dashboardData.recentNotices.map((notice) => {
                        const Icon = getCategoryIcon(notice.category)
                        return (
                          <div
                            key={notice.id}
                            className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors"
                          >
                            <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {notice.title}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={cn('text-[9px] px-1.5 py-0', getCategoryBadgeStyle(notice.category))}
                                >
                                  {notice.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {notice.content}
                              </p>
                              {notice.publishedAt && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Published: {format(new Date(notice.publishedAt), 'MMMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  )
}
