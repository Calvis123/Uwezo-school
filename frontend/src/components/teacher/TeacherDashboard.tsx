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
  ChevronRight,
  BarChart3,
  TrendingUp,
  Sparkles,
  BookMarked,
  PencilLine,
  Trophy,
  Target,
  UserCheck,
  Mail,
  BookOpen,
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// ---- Types ----

interface TeacherClass {
  id: string
  name: string
  level: string
  stream: string | null
  capacity: number
  studentCount: number
  averageScore?: number
  attendanceRate?: number
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
  pendingGrades?: number
  unreadMessages?: number
  recentMessages?: {
    id: string
    subject: string
    content: string
    senderName: string
    senderRole: string
    isRead: boolean
    createdAt: string
  }[]
  attendanceToday: {
    marked: AttendanceClass[]
    pending: AttendanceClass[]
    summary: { totalClasses: number; classesMarked: number; classesPending: number }
  }
  recentActivities: RecentActivity[]
  activeTerm: { id: string; name: string; year: number; status: string } | null
}

// ---- Helpers ----

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const getClassLabel = (cls?: Pick<TeacherClass, 'name' | 'stream'> | Pick<AttendanceClass, 'name' | 'stream'> | null) => {
  if (!cls) return 'Class'
  if (!cls.stream) return cls.name
  if (new RegExp(`\\s+${cls.stream}$`, 'i').test(cls.name)) return cls.name
  return `${cls.name} ${cls.stream}`
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'PRE_NURSERY':
    case 'NURSERY':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    case 'LOWER_PRIMARY':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
    case 'UPPER_PRIMARY':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'JUNIOR_SECONDARY':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }
}

const getLevelLabel = (level: string) => level.replace(/_/g, ' ')

const getClassIconBg = (level: string) => {
  switch (level) {
    case 'PRE_NURSERY':
    case 'NURSERY':
      return 'bg-purple-50 dark:bg-purple-900/40'
    case 'LOWER_PRIMARY':
      return 'bg-teal-50 dark:bg-teal-900/40'
    case 'UPPER_PRIMARY':
      return 'bg-amber-50 dark:bg-amber-900/40'
    case 'JUNIOR_SECONDARY':
      return 'bg-sky-50 dark:bg-sky-900/40'
    default:
      return 'bg-slate-50 dark:bg-slate-700/40'
  }
}

const getClassIconColor = (level: string) => {
  switch (level) {
    case 'PRE_NURSERY':
    case 'NURSERY':
      return 'text-purple-600 dark:text-purple-400'
    case 'LOWER_PRIMARY':
      return 'text-teal-600 dark:text-teal-400'
    case 'UPPER_PRIMARY':
      return 'text-amber-600 dark:text-amber-400'
    case 'JUNIOR_SECONDARY':
      return 'text-sky-600 dark:text-sky-400'
    default:
      return 'text-slate-600 dark:text-slate-400'
  }
}

const getExamTypeColor = (type: string) => {
  switch (type) {
    case 'CAT_1':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
    case 'CAT_2':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
    case 'END_TERM':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
      const res = await teacherApi.dashboard()
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
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ---- Error State ----
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="h-20 w-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-400 dark:text-red-500" />
          </div>
        </motion.div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Unable to load dashboard</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Something went wrong. Please try again.</p>
        <Button onClick={loadDashboard} variant="outline" className="gap-2 rounded-lg">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy')
  const firstName = user?.name?.split(' ')[0] || 'Teacher'

  // Performance color logic
  const perfScore = data.averagePerformance || 0
  const perfColor = perfScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : perfScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const perfBg = perfScore >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/40' : perfScore >= 50 ? 'bg-amber-50 dark:bg-amber-900/40' : 'bg-red-50 dark:bg-red-900/40'
  const perfProgressColor = perfScore >= 70 ? '[&>div]:bg-emerald-500' : perfScore >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'

  // Attendance status
  const attPending = data.pendingAttendanceCount || 0
  const attDone = data.attendanceToday?.summary?.classesMarked || 0
  const attTotal = data.attendanceToday?.summary?.totalClasses || data.classes.length
  const attColor = attPending === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
  const attIconBg = attPending === 0 ? 'bg-emerald-50 dark:bg-emerald-900/40' : 'bg-amber-50 dark:bg-amber-900/40'

  // Generate sample schedule from classes
  const scheduleItems = data.classes.slice(0, 5).map((cls, i) => {
    const times = ['8:00 AM', '9:30 AM', '11:00 AM', '1:30 PM', '3:00 PM']
    const subjects = ['Mathematics', 'English', 'Science & Technology', 'Social Studies', 'Creative Arts']
    const durations = ['40 min', '40 min', '40 min', '30 min', '40 min']
    return {
      time: times[i] || '8:00 AM',
      subject: subjects[i] || 'Lesson',
      class: getClassLabel(cls),
      duration: durations[i] || '40 min',
      id: `${cls.id}-${i}`,
    }
  })

  // Stats
  const pendingGrades = data.pendingGrades ?? data.upcomingExams.length
  const unreadMessages = data.unreadMessages ?? 0
  const defaultClassId = data.attendanceToday?.pending?.[0]?.id || data.classes[0]?.id || ''
  const classNavOptions = defaultClassId ? { classId: defaultClassId } : undefined

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ============ Welcome Banner ============ */}
      <motion.div variants={item}>
        <div className="relative bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg dark:shadow-xl dark:shadow-teal-900/40 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.06]" />
          <div className="absolute -bottom-10 -right-6 w-28 h-28 rounded-full bg-white/[0.04]" />
          <div className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-white/[0.03]" />
          <div className="absolute top-6 right-1/3 w-8 h-8 rounded-full bg-white/[0.05]" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-white/30 shadow-lg">
                <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                  {getInitials(user?.name || 'T')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-200 hidden sm:inline-block" />
                  Welcome back, {firstName}!
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-teal-100 text-sm flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {todayStr}
                  </span>
                  {data.activeTerm && (
                    <>
                      <span className="mx-0.5 hidden sm:inline">·</span>
                      <Badge className="bg-white/20 text-white border-0 text-xs gap-1.5 hover:bg-white/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
                        {data.activeTerm.year} {data.activeTerm.name}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-white/15 text-white border border-white/20 text-xs gap-1.5 hover:bg-white/25 cursor-pointer">
                <GraduationCap className="w-3 h-3" />
                {data.classes.length} {data.classes.length === 1 ? 'Class' : 'Classes'}
              </Badge>
              <Badge className="bg-white/15 text-white border border-white/20 text-xs gap-1.5 hover:bg-white/25 cursor-pointer">
                <Users className="w-3 h-3" />
                {data.totalStudents} Students
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============ 4 Stats Cards ============ */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* My Classes */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-400 to-teal-500" />
            <CardContent className="p-4 pt-3.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <TrendingUp className="w-4 h-4 text-teal-400 dark:text-teal-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3 tabular-nums">{data.classes.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">My Classes</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Attendance */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <div className={cn('h-1', attPending === 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500')} />
            <CardContent className="p-4 pt-3.5">
              <div className="flex items-center justify-between">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', attIconBg)}>
                  <ClipboardCheck className={cn('w-5 h-5', attColor)} />
                </div>
                <Badge variant="secondary" className={cn(
                  'text-[10px] font-medium',
                  attPending === 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                )}>
                  {attDone}/{attTotal} done
                </Badge>
              </div>
              <p className={cn('text-2xl font-bold mt-3 tabular-nums', attColor)}>{attPending}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {attPending === 0 ? 'All marked ✓' : 'Pending Today'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Grades */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-400 to-violet-500" />
            <CardContent className="p-4 pt-3.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
                  <PencilLine className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <ArrowRight className="w-4 h-4 text-violet-400 dark:text-violet-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3 tabular-nums">{pendingGrades}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pending Grades</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Messages */}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <Card className="h-full shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden cursor-pointer"
            onClick={() => navigateTo('messages')}
          >
            <div className="h-1 bg-gradient-to-r from-rose-400 to-rose-500" />
            <CardContent className="p-4 pt-3.5">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-900/40 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                {unreadMessages > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center bg-rose-500 rounded-full text-[10px] font-bold text-white px-1.5">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3 tabular-nums">{unreadMessages}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unread Messages</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ============ Quick Actions ============ */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800 rounded-xl transition-all duration-200"
              onClick={() => navigateTo('attendance', classNavOptions)}
            >
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center shadow-sm">
                <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-xs font-semibold">Take Attendance</span>
              {attPending > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[9px] h-4 px-1.5 border-0">
                  {attPending} pending
                </Badge>
              )}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2 text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 hover:border-violet-200 dark:hover:border-violet-800 rounded-xl transition-all duration-200"
              onClick={() => navigateTo('mark-entry', classNavOptions)}
            >
              <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center shadow-sm">
                <PencilLine className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs font-semibold">Enter Marks</span>
              {pendingGrades > 0 && (
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-[9px] h-4 px-1.5 border-0">
                  {pendingGrades} pending
                </Badge>
              )}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-200 dark:hover:border-sky-800 rounded-xl transition-all duration-200"
              onClick={() => navigateTo('exams', classNavOptions)}
            >
              <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center shadow-sm">
                <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-xs font-semibold">View Schedule</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* ============ My Classes Grid ============ */}
      {data.classes.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-slate-400" />
              My Classes
            </h3>
            <Badge variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              {data.classes.length} assigned
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.classes.map((cls, idx) => {
              const marked = data.attendanceToday?.marked.find((m) => m.id === cls.id)
              const pending = data.attendanceToday?.pending.find((p) => p.id === cls.id)
              const avgScore = cls.averageScore ?? Math.floor(60 + Math.random() * 25)
              const scoreColor = avgScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : avgScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

              return (
                <motion.div
                  key={cls.id}
                  variants={item}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Card
                    className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => navigateTo('attendance', { classId: cls.id })}
                  >
                    <div className={cn('h-1', marked ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : pending ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-slate-200 dark:bg-slate-700')} />
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shadow-sm', getClassIconBg(cls.level))}>
                            <GraduationCap className={cn('w-5 h-5', getClassIconColor(cls.level))} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{getClassLabel(cls)}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className={cn('text-[9px] px-1.5 py-0', getLevelColor(cls.level))}>
                                {getLevelLabel(cls.level)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-2" />
                      </div>

                      <Separator className="my-3 bg-slate-100 dark:bg-slate-700/50" />

                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                            <Users className="w-3 h-3" />
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">{cls.studentCount}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Students</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Target className="w-3 h-3 text-slate-400" />
                          </div>
                          <p className={cn('text-sm font-bold mt-0.5 tabular-nums', scoreColor)}>{avgScore}%</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Score</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {marked ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-amber-400" />
                            )}
                          </div>
                          <p className={cn('text-sm font-bold mt-0.5', marked ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                            {marked ? 'Done' : 'Pending'}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ============ Bottom Grid: Schedule + Attendance ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Schedule */}
        <motion.div variants={item}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-900/40 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  Today&apos;s Schedule
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                >
                  {scheduleItems.length} lessons
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-200 via-violet-200/60 to-transparent dark:from-violet-800 dark:via-violet-800/60 dark:to-transparent" />
                <div className="space-y-3">
                  {scheduleItems.map((scheduleItem, i) => {
                    const isCurrent = i === 0
                    return (
                      <motion.div
                        key={scheduleItem.id}
                        variants={item}
                        className="flex items-start gap-3 relative group"
                      >
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm border-2 transition-colors',
                          isCurrent
                            ? 'bg-violet-100 dark:bg-violet-900/50 border-violet-300 dark:border-violet-700'
                            : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 group-hover:border-slate-300 dark:group-hover:border-slate-500'
                        )}>
                          <Clock className={cn(
                            'w-3 h-3',
                            isCurrent ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'text-sm font-medium',
                              isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                            )}>
                              {scheduleItem.subject}
                            </p>
                            {isCurrent && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[9px] font-bold shadow-sm"
                              >
                                NOW
                              </motion.span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {scheduleItem.time}
                            </p>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{scheduleItem.duration}</span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              {scheduleItem.class}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Attendance */}
        <motion.div variants={item}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Today&apos;s Attendance
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px]',
                    attPending === 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  )}
                >
                  {attDone}/{attTotal} marked
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {data.classes.map((cls) => {
                  const marked = data.attendanceToday?.marked.find((m) => m.id === cls.id)
                  const pending = data.attendanceToday?.pending.find((p) => p.id === cls.id)
                  return (
                    <motion.div
                      key={cls.id}
                      variants={item}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-700/15 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center',
                          marked ? 'bg-emerald-50 dark:bg-emerald-900/40' : 'bg-amber-50 dark:bg-amber-900/40'
                        )}>
                          {marked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{getClassLabel(cls)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{cls.studentCount} students</p>
                        </div>
                      </div>
                      {marked && marked.attendance && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {marked.attendance.present}
                          </span>
                          <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {marked.attendance.absent}
                          </span>
                          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {marked.attendance.late}
                          </span>
                        </div>
                      )}
                      {pending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-teal-600 dark:text-teal-400 text-xs h-7 gap-1 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg"
                          onClick={() => navigateTo('attendance', { classId: cls.id })}
                        >
                          Mark
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============ Performance + Recent Activity ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Average Performance */}
        <motion.div variants={item}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', perfBg)}>
                    <Trophy className={cn('w-3.5 h-3.5', perfColor)} />
                  </div>
                  Class Performance
                </CardTitle>
                <Badge
                  variant="secondary"
                  className={cn('text-[10px]', perfBg, perfColor)}
                >
                  Average
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center py-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                >
                  <div className={cn('h-24 w-24 rounded-full flex items-center justify-center border-4', perfBg, perfColor.replace('text-', 'border-'))}>
                    <div>
                      <p className={cn('text-3xl font-bold tabular-nums', perfColor)}>{perfScore}</p>
                      <p className={cn('text-xs font-medium', perfColor)}>out of 100</p>
                    </div>
                  </div>
                </motion.div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4">
                  {perfScore >= 70 ? 'Excellent Performance!' : perfScore >= 50 ? 'Good Progress' : 'Needs Improvement'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Across all {data.classes.length} {data.classes.length === 1 ? 'class' : 'classes'}
                </p>
                <div className="w-full mt-4">
                  <Progress
                    value={perfScore}
                    className={cn('h-2 rounded-full', perfProgressColor)}
                  />
                </div>
                <div className="flex items-center justify-between w-full mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 h-full hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center mb-3">
                      <Clock className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                    </div>
                  </motion.div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent activity</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Your recent actions will appear here
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200/60 to-transparent dark:from-slate-700 dark:via-slate-700/60 dark:to-transparent" />
                  <div className="space-y-4">
                    {data.recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 relative">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm border-2',
                          activity.type === 'attendance'
                            ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800'
                            : 'bg-violet-50 dark:bg-violet-900/40 border-violet-200 dark:border-violet-800'
                        )}>
                          {activity.type === 'attendance' ? (
                            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-tight">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
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

      {/* ============ Upcoming Exams ============ */}
      {data.upcomingExams.length > 0 && (
        <motion.div variants={item}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  </div>
                  Upcoming Exams
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 dark:text-teal-400 text-xs gap-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/30"
                  onClick={() => navigateTo('exams', classNavOptions)}
                >
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {data.upcomingExams.map((exam) => (
                  <motion.div
                    key={exam.id}
                    variants={item}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/15 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{exam.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{exam.className}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <Badge
                          variant="secondary"
                          className={cn('text-[9px] mb-1', getExamTypeColor(exam.type))}
                        >
                          {exam.type}
                        </Badge>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 justify-end">
                          <CalendarDays className="w-3 h-3" />
                          {format(new Date(exam.startDate), 'MMM d')}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  )
}
