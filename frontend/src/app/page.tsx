'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { LoginPage } from '@/components/auth/LoginPage'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { RoleCenter } from '@/components/dashboard/RoleCenter'
import { StudentList } from '@/components/students/StudentList'
import { StudentDetail } from '@/components/students/StudentDetail'
import { FeeStructures } from '@/components/fees/FeeStructures'
import { FeePayments } from '@/components/fees/FeePayments'
import { FeeReports } from '@/components/fees/FeeReports'
import { ExamList } from '@/components/exams/ExamList'
import { MarkEntry } from '@/components/exams/MarkEntry'
import { ReportCards } from '@/components/exams/ReportCards'
import { AttendanceMarking } from '@/components/attendance/AttendanceMarking'
import { NoticeList } from '@/components/notices/NoticeList'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { UserManagement } from '@/components/users/UserManagement'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TeacherWorkspace } from '@/components/teacher/TeacherWorkspace'
import { MessagingPage } from '@/components/messaging/MessagingPage'
import { ExportData } from '@/components/export/ExportData'
import { ClassManagement } from '@/components/classes/ClassManagement'
import { AnalyticsPage } from '@/components/analytics/AnalyticsPage'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { FeesPage } from '@/components/fees/FeesPage'
import { ClassReport } from '@/components/reports/ClassReport'
import { StudentPromotion } from '@/components/students/StudentPromotion'
import { LibraryPage } from '@/components/library/LibraryPage'
import { HealthRecords } from '@/components/health/HealthRecords'
import { TransportPage } from '@/components/transport/TransportPage'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLoader } from '@/components/layout/AppLoader'
import { ParentDashboard } from '@/components/parent/ParentDashboard'
import { authApi } from '@/lib/api'
import { clearTabAuthenticated, isTabSessionFresh, touchTabAuthenticated } from '@/lib/tab-auth'

const REAUTH_AFTER_HIDDEN_MS = 60 * 1000
const REAUTH_AFTER_SLEEP_DRIFT_MS = 60 * 1000
const TAB_SESSION_MAX_IDLE_MS = 5 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 5000

function ViewRouter() {
  const { currentView } = useAppStore()

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardHome />,
    'role-center': <RoleCenter />,
    'parent-dashboard': <ParentDashboard />,
    users: <UserManagement />,
    students: <StudentList />,
    'student-detail': <StudentDetail />,
    classes: <ClassManagement />,
    analytics: <AnalyticsPage />,
    fees: <FeesPage />,
    export: <ExportData />,
    exams: <ExamsPage />,
    'mark-entry': <MarkEntry />,
    'report-cards': <ReportCards />,
    'class-reports': <ClassReport />,
    promotions: <StudentPromotion />,
    attendance: <AttendanceMarking />,
    calendar: <CalendarView />,
    'teacher-dashboard': <TeacherWorkspace />,
    messages: <MessagingPage />,
    notices: <NoticeList />,
    library: <LibraryPage />,
    health: <HealthRecords />,
    transport: <TransportPage />,
    documents: <DocumentsPage />,
    activity: <ActivityFeed />,
    settings: <SettingsPage />,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {views[currentView] || <DashboardHome />}
      </motion.div>
    </AnimatePresence>
  )
}

function ExamsPage() {
  return (
    <Tabs defaultValue="exams">
      <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto">
        <TabsTrigger value="exams" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
          Exams
        </TabsTrigger>
        <TabsTrigger value="marks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
          Mark Entry
        </TabsTrigger>
        <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
          Report Cards
        </TabsTrigger>
      </TabsList>
      <TabsContent value="exams" className="mt-4">
        <ExamList />
      </TabsContent>
      <TabsContent value="marks" className="mt-4">
        <MarkEntry />
      </TabsContent>
      <TabsContent value="reports" className="mt-4">
        <ReportCards />
      </TabsContent>
    </Tabs>
  )
}

export default function Home() {
  const { isAuthenticated, currentView, setUser, login, logout } = useAppStore()
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!isTabSessionFresh(TAB_SESSION_MAX_IDLE_MS)) {
          clearTabAuthenticated()
          if (!cancelled) setUser(null)
          return
        }
        touchTabAuthenticated()
        const res = await authApi.me()
        if (cancelled) return
        if (res.success && res.data) {
          login({
            id: res.data.id,
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            avatar: res.data.avatar || undefined,
          })
        } else {
          clearTabAuthenticated()
          setUser(null)
        }
      } catch {
        clearTabAuthenticated()
        if (!cancelled) logout()
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [login, logout, setUser])

  useEffect(() => {
    if (!isAuthenticated) return

    let hiddenAt: number | null = null
    let lastTick = Date.now()
    let forcingLogout = false

    const forceReauth = async () => {
      if (forcingLogout) return
      forcingLogout = true
      clearTabAuthenticated()
      try {
        await authApi.logout()
      } catch {
        // Even if logout API fails, clear local auth state.
      } finally {
        logout()
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }

      if (hiddenAt && Date.now() - hiddenAt >= REAUTH_AFTER_HIDDEN_MS) {
        void forceReauth()
        return
      }
      hiddenAt = null
      touchTabAuthenticated()
    }

    const heartbeatId = window.setInterval(() => {
      const now = Date.now()
      const drift = now - lastTick
      lastTick = now
      if (drift >= REAUTH_AFTER_SLEEP_DRIFT_MS) {
        void forceReauth()
        return
      }
      if (!isTabSessionFresh(TAB_SESSION_MAX_IDLE_MS)) {
        void forceReauth()
        return
      }
      touchTabAuthenticated()
    }, HEARTBEAT_INTERVAL_MS)

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(heartbeatId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, logout])

  if (hydrating) return <AppLoader />

  // Show login page when not authenticated
  if (!isAuthenticated || currentView === 'login') {
    return <LoginPage />
  }

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <ViewRouter />
      </DashboardLayout>
    </ErrorBoundary>
  )
}
