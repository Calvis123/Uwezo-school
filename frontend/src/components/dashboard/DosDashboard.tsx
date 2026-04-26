'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  Download,
  GraduationCap,
  School,
  Users,
  CalendarDays,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { attendanceApi, examsApi, noticesApi, refApi, studentsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DosStats {
  totalStudents: number
  totalClasses: number
  totalExams: number
  activeExams: number
  completedExams: number
  attendanceRate: number
  publishedNotices: number
}

export function DosDashboard() {
  const { navigateTo, user } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState<DosStats | null>(null)
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [classAttendance, setClassAttendance] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [classesRes, studentsRes, examsRes, attendanceRes, noticesRes] = await Promise.all([
        refApi.classes(),
        studentsApi.list({ page: 1, limit: 1, status: 'ACTIVE' }),
        examsApi.list(),
        attendanceApi.stats(),
        noticesApi.list(),
      ])

      const classes = classesRes.success && Array.isArray(classesRes.data) ? classesRes.data : []
      const studentsTotal = studentsRes.success ? (studentsRes.data?.total || 0) : 0
      const exams = examsRes.success && Array.isArray(examsRes.data) ? examsRes.data : []
      const attendanceRate = attendanceRes.success ? (attendanceRes.data?.overall?.attendanceRate || 0) : 0
      const noticesCount = noticesRes.success && Array.isArray(noticesRes.data) ? noticesRes.data.length : 0

      const now = new Date()
      const sortedExams = [...exams].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      setUpcomingExams(
        sortedExams
          .filter((exam) => new Date(exam.startDate) >= now)
          .slice(0, 5)
      )

      const classWise = attendanceRes.success && Array.isArray(attendanceRes.data?.classWise)
        ? attendanceRes.data.classWise
        : []
      setClassAttendance(classWise.slice(0, 6))

      setStats({
        totalStudents: studentsTotal,
        totalClasses: classes.length,
        totalExams: exams.length,
        activeExams: exams.filter((exam) => exam.status === 'ACTIVE').length,
        completedExams: exams.filter((exam) => exam.status === 'COMPLETED').length,
        attendanceRate,
        publishedNotices: noticesCount,
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), [])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-600 rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-100">Director of Studies</p>
            <h2 className="text-xl font-semibold mt-0.5">Academic Command Center</h2>
            <p className="text-sm text-indigo-100 mt-1">
              Welcome {user?.name?.split(' ')[0] || 'DOS'} — exams, results, class performance, and academic quality.
            </p>
            <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {today}
            </p>
          </div>
          <Badge className="bg-white/15 text-white border-white/20">Academic Only</Badge>
        </div>
      </motion.div>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">Couldn’t load DOS dashboard data.</p>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !stats ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Users} label="Active Students" value={stats.totalStudents} tint="teal" />
            <StatCard icon={School} label="Active Classes" value={stats.totalClasses} tint="sky" />
            <StatCard icon={BookOpenCheck} label="Total Exams" value={stats.totalExams} tint="indigo" />
            <StatCard icon={ClipboardCheck} label="Attendance Rate" value={`${stats.attendanceRate}%`} tint="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">DOS Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickButton icon={FileText} label="Exams & Results" onClick={() => navigateTo('exams')} />
            <QuickButton icon={ClipboardCheck} label="Mark Entry" onClick={() => navigateTo('mark-entry')} />
            <QuickButton icon={GraduationCap} label="Class Reports" onClick={() => navigateTo('class-reports')} />
            <QuickButton icon={Users} label="Students" onClick={() => navigateTo('students')} />
            <QuickButton icon={ClipboardCheck} label="Attendance" onClick={() => navigateTo('attendance')} />
            <QuickButton icon={Download} label="Data Export" onClick={() => navigateTo('export')} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)
            ) : upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming exams scheduled.</p>
            ) : (
              upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{exam.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {exam.class?.name || 'Class'} {exam.class?.stream || ''} · {format(new Date(exam.startDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">{exam.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Class Attendance Snapshot</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('attendance')}>
              Open Attendance <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)
          ) : classAttendance.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No class attendance stats available.</p>
          ) : (
            classAttendance.map((row) => (
              <div key={row.classId} className="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2">
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {row.className} {row.stream || ''}
                </p>
                <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {row.attendanceRate}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  tint: 'teal' | 'sky' | 'indigo' | 'emerald'
}) {
  const tints: Record<string, string> = {
    teal: 'from-teal-500 to-cyan-500',
    sky: 'from-sky-500 to-blue-500',
    indigo: 'from-indigo-500 to-violet-500',
    emerald: 'from-emerald-500 to-green-500',
  }

  return (
    <Card className="border-slate-200/70 dark:border-slate-700/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
          </div>
          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${tints[tint]} flex items-center justify-center`}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <Button variant="outline" className="justify-start" onClick={onClick}>
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
