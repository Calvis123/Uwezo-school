'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  School,
  Users,
  UserPlus,
  ArrowRight,
  MailOpen,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { messagesApi, noticesApi, refApi, studentsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SecretaryStats {
  activeStudents: number
  activeClasses: number
  publishedNotices: number
  inboxMessages: number
}

function getClassLabel(cls?: { name?: string | null; stream?: string | null }) {
  if (!cls?.name) return 'No class'
  if (!cls.stream) return cls.name
  if (new RegExp(`\\s+${cls.stream}$`, 'i').test(cls.name)) return cls.name
  return `${cls.name} ${cls.stream}`
}

export function SecretaryDashboard() {
  const { navigateTo, user } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState<SecretaryStats | null>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState('all')
  const [studentsPreview, setStudentsPreview] = useState<any[]>([])
  const [recentNotices, setRecentNotices] = useState<any[]>([])
  const [inboxPreview, setInboxPreview] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    setError(false)
    try {
      const [studentsTotalRes, classesRes, noticesRes, inboxRes, studentsPreviewRes] = await Promise.all([
        studentsApi.list({ page: 1, limit: 1, status: 'ACTIVE' }),
        refApi.classes(),
        noticesApi.list(),
        user?.id ? messagesApi.list(user.id, 'inbox') : Promise.resolve({ success: false }),
        studentsApi.list({
          page: 1,
          limit: 10,
          status: 'ACTIVE',
          ...(selectedClassId !== 'all' ? { classId: selectedClassId } : {}),
        }),
      ])

      const studentsTotal = studentsTotalRes.success ? (studentsTotalRes.data?.total || 0) : 0
      const classList = classesRes.success && Array.isArray(classesRes.data) ? classesRes.data : []
      const classCount = classList.length
      const notices = noticesRes.success && Array.isArray(noticesRes.data) ? noticesRes.data : []
      const inboxItems = inboxRes.success ? (inboxRes.data?.items || inboxRes.data || []) : []
      const preview = studentsPreviewRes.success ? (studentsPreviewRes.data?.items || []) : []

      setClasses(classList)
      setRecentNotices(notices.slice(0, 5))
      setInboxPreview(inboxItems.slice(0, 5))
      setStudentsPreview(preview)

      setStats({
        activeStudents: studentsTotal,
        activeClasses: classCount,
        publishedNotices: notices.length,
        inboxMessages: inboxItems.length,
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedClassId, user?.id])

  const today = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), [])
  const selectedClassNavOptions = selectedClassId !== 'all' ? { classId: selectedClassId } : undefined

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-r from-cyan-600 via-cyan-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-cyan-100">Secretary</p>
            <h2 className="text-xl font-semibold mt-0.5">Office Operations Dashboard</h2>
            <p className="text-sm text-cyan-100 mt-1">
              Student records, admissions support, notices, and communication in one place.
            </p>
            <p className="text-xs text-cyan-200 mt-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {today}
            </p>
          </div>
          <Badge className="bg-white/15 text-white border-white/20">Non-Finance</Badge>
        </div>
      </motion.div>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">Could not load secretary dashboard data.</p>
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
            <StatCard icon={Users} label="Active Students" value={stats.activeStudents} />
            <StatCard icon={School} label="Active Classes" value={stats.activeClasses} />
            <StatCard icon={Bell} label="Published Notices" value={stats.publishedNotices} />
            <StatCard icon={MessageSquare} label="Inbox Messages" value={stats.inboxMessages} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Student Records Snapshot</CardTitle>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[190px] h-8">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {getClassLabel(cls)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)
            ) : studentsPreview.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No active students for this class filter.</p>
            ) : (
              studentsPreview.map((student: any) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {student.admissionNumber} - {getClassLabel(student.class)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {student.status}
                  </Badge>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full justify-between" onClick={() => navigateTo('students', selectedClassNavOptions)}>
              Open full student records
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickButton icon={UserPlus} label="Admissions / Students" onClick={() => navigateTo('students', selectedClassNavOptions)} />
            <QuickButton icon={Bell} label="Post Notice" onClick={() => navigateTo('notices')} />
            <QuickButton icon={MessageSquare} label="Messages" onClick={() => navigateTo('messages')} />
            <QuickButton icon={CalendarDays} label="School Calendar" onClick={() => navigateTo('calendar')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Notices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateTo('notices')}>
                Open Notices <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)
            ) : recentNotices.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No notices yet.</p>
            ) : (
              recentNotices.map((notice) => (
                <div key={notice.id} className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{notice.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{notice.content}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Inbox Preview</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('messages')}>
              Open Messages <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)
          ) : inboxPreview.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No inbox messages.</p>
          ) : (
            inboxPreview.map((msg: any) => (
              <div key={msg.id} className="flex items-center justify-between rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{msg.subject || 'No subject'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{msg.sender?.name || 'Unknown sender'}</p>
                </div>
                {!msg.isRead ? <MailOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card className="border-slate-200/70 dark:border-slate-700/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="justify-start" onClick={onClick}>
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
