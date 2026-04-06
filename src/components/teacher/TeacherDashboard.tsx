'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Users,
  ClipboardCheck,
  FileText,
  GraduationCap,
  CalendarDays,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  MessageSquare,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { teacherApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// ---- Types ----

interface TeacherClass {
  id: string
  name: string
  level: string
  stream: string | null
  capacity: number
  studentCount: number
}

interface UpcomingExam {
  id: string
  name: string
  type: string
  status: string
  startDate: string
  endDate: string
  className: string
}

interface AttendanceClass {
  id: string
  name: string
  level: string
  stream: string | null
  studentCount: number
  attendance?: { total: number; present: number; absent: number; late: number }
}

interface RecentActivity {
  id: string
  type: 'attendance' | 'exam'
  description: string
  className: string
  timestamp: string
}

interface TeacherDashboardData {
  teacher: { id: string; name: string; email: string }
  classes: TeacherClass[]
  totalStudents: number
  pendingAttendanceCount: number
  upcomingExams: UpcomingExam[]
  averagePerformance: number
  attendanceToday: {
    marked: AttendanceClass[]
    pending: AttendanceClass[]
    summary: { totalClasses: number; classesMarked: number; classesPending: number }
  }
  recentActivities: RecentActivity[]
  activeTerm: { id: string; name: string; year: number; status: string } | null
}

// ---- Component ----

export function TeacherDashboard() {
  const { user, navigateTo } = useAppStore()
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
    }
  }, [user?.id])

  const loadDashboard = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(false)
    try {
      const res = await teacherApi.dashboard(user.id)
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  // ---- Error State ----
  if (error || !data) {
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

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy')
  const perfColor = data.averagePerformance >= 70 ? 'text-emerald-600 dark:text-emerald-400' : data.averagePerformance >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const perfBg = data.averagePerformance >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/40' : data.averagePerformance >= 50 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'
  const perfIconBg = data.averagePerformance >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/40' : data.averagePerformance >= 50 ? 'bg-amber-50 dark:bg-amber-900/40' : 'bg-red-50 dark:bg-red-900/40'

  return (
    <div className="space-y-6">
      {/* ---- Welcome Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-r from-teal-600 via-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg dark:shadow-xl dark:shadow-teal-900/40 relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-4 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-white/30">
              <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Welcome, {user?.name?.split(' ')[0] || 'Teacher'}!
              </h2>
              <p className="text-teal-100 text-sm mt-1 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5" />
                Teacher Portal
                <span className="mx-1">·</span>
                {todayStr}
                {data.activeTerm && (
                  <span className="inline-flex items-center ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-300 mr-1.5 inline-block" />
                    {data.activeTerm.year} {data.activeTerm.name}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 text-xs">
              <GraduationCap className="w-3 h-3 mr-1" />
              {data.classes.length} {data.classes.length === 1 ? 'Class' : 'Classes'}
            </Badge>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              <Users className="w-3 h-3 mr-1" />
              {data.totalStudents} Students
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* ---- My Classes ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">My Classes</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.classes.map((cls, idx) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 + idx * 0.05 }}
              className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigateTo('attendance', { classId: cls.id })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{cls.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{cls.studentCount} students</p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    cls.level === 'PRE_NURSERY' || cls.level === 'NURSERY'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : cls.level === 'PRIMARY'
                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  )}
                >
                  {cls.level.replace('_', ' ')}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ---- 4 Summary Cards ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {/* Total Students */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Students</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{data.totalStudents}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Across {data.classes.length} classes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Attendance */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pending Attendance</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center',
                data.pendingAttendanceCount > 0
                  ? 'bg-amber-50 dark:bg-amber-900/40'
                  : 'bg-green-50 dark:bg-green-900/40'
              )}>
                <ClipboardCheck className={cn(
                  'w-5 h-5',
                  data.pendingAttendanceCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
                )} />
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  data.pendingAttendanceCount > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
                )}>
                  {data.pendingAttendanceCount}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {data.pendingAttendanceCount > 0 ? 'Classes pending today' : 'All done for today'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{data.upcomingExams.length}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {data.upcomingExams.length > 0
                    ? `Next: ${data.upcomingExams[0].name}`
                    : 'No upcoming exams'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Performance */}
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg. Performance</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', perfIconBg)}>
                <BarChart3 className={cn('w-5 h-5', perfColor)} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold tabular-nums', perfColor)}>{data.averagePerformance}%</p>
                <Progress
                  value={data.averagePerformance}
                  className={cn('h-1.5 mt-1', data.averagePerformance >= 70 ? '[&>div]:bg-emerald-500' : data.averagePerformance >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Quick Actions ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full h-14 flex-col gap-1 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800"
                  onClick={() => navigateTo('attendance')}
                >
                  <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-xs font-medium">Mark Attendance</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full h-14 flex-col gap-1 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-200 dark:hover:border-blue-800"
                  onClick={() => navigateTo('mark-entry')}
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium">Enter Marks</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full h-14 flex-col gap-1 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-200 dark:hover:border-purple-800"
                  onClick={() => navigateTo('calendar')}
                >
                  <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs font-medium">View Schedule</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full h-14 flex-col gap-1 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-200 dark:hover:border-amber-800"
                  onClick={() => navigateTo('messages')}
                >
                  <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium">Communicate</span>
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Today's Attendance + Recent Activity ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Attendance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Today&apos;s Attendance
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    data.attendanceToday.summary.classesPending === 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  )}
                >
                  {data.attendanceToday.summary.classesMarked}/{data.attendanceToday.summary.totalClasses} marked
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.classes.map((cls) => {
                  const marked = data.attendanceToday.marked.find((m) => m.id === cls.id)
                  const pending = data.attendanceToday.pending.find((p) => p.id === cls.id)
                  return (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-700/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center',
                          marked ? 'bg-green-50 dark:bg-green-900/40' : 'bg-amber-50 dark:bg-amber-900/40'
                        )}>
                          {marked ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{cls.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{cls.studentCount} students</p>
                        </div>
                      </div>
                      {marked && marked.attendance && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {marked.attendance.present}
                          </span>
                          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {marked.attendance.absent}
                          </span>
                          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {marked.attendance.late}
                          </span>
                        </div>
                      )}
                      {pending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-teal-600 dark:text-teal-400 text-xs h-7"
                          onClick={() => navigateTo('attendance', { classId: cls.id })}
                        >
                          Mark <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 dark:text-slate-500 text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700 dark:to-transparent" />
                  <div className="space-y-4">
                    {data.recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 relative">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm',
                          activity.type === 'attendance'
                            ? 'bg-green-50 dark:bg-green-900/40 border-2 border-green-200 dark:border-green-800'
                            : 'bg-blue-50 dark:bg-blue-900/40 border-2 border-blue-200 dark:border-blue-800'
                        )}>
                          {activity.type === 'attendance' ? (
                            <ClipboardCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                            </p>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              {activity.className}
                            </Badge>
                          </div>
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

      {/* ---- Upcoming Exams ---- */}
      {data.upcomingExams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Exams</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 dark:text-teal-400 text-xs"
                  onClick={() => navigateTo('exams')}
                >
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 dark:bg-slate-700/20 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{exam.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{exam.className}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[9px] mb-1',
                          exam.type === 'CAT_1' || exam.type === 'CAT_2'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                        )}
                      >
                        {exam.type}
                      </Badge>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 justify-end">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(exam.startDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
