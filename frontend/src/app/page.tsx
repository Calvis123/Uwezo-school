'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLoader } from '@/components/layout/AppLoader'
import { authApi } from '@/lib/api'
import { clearTabAuthenticated, isTabAuthenticated, touchTabAuthenticated } from '@/lib/tab-auth'

const LoadingView = () => <AppLoader />

const LoginPage = dynamic(() => import('@/components/auth/LoginPage').then((mod) => mod.LoginPage), { loading: LoadingView })
const DashboardLayout = dynamic(() => import('@/components/layout/DashboardLayout').then((mod) => mod.DashboardLayout), { loading: LoadingView })
const DashboardHome = dynamic(() => import('@/components/dashboard/DashboardHome').then((mod) => mod.DashboardHome), { loading: LoadingView })
const RoleCenter = dynamic(() => import('@/components/dashboard/RoleCenter').then((mod) => mod.RoleCenter), { loading: LoadingView })
const ParentDashboard = dynamic(() => import('@/components/parent/ParentDashboard').then((mod) => mod.ParentDashboard), { loading: LoadingView })
const UserManagement = dynamic(() => import('@/components/users/UserManagement').then((mod) => mod.UserManagement), { loading: LoadingView })
const StudentList = dynamic(() => import('@/components/students/StudentList').then((mod) => mod.StudentList), { loading: LoadingView })
const StudentDetail = dynamic(() => import('@/components/students/StudentDetail').then((mod) => mod.StudentDetail), { loading: LoadingView })
const ClassManagement = dynamic(() => import('@/components/classes/ClassManagement').then((mod) => mod.ClassManagement), { loading: LoadingView })
const AnalyticsPage = dynamic(() => import('@/components/analytics/AnalyticsPage').then((mod) => mod.AnalyticsPage), { loading: LoadingView })
const FeesPage = dynamic(() => import('@/components/fees/FeesPage').then((mod) => mod.FeesPage), { loading: LoadingView })
const ExportData = dynamic(() => import('@/components/export/ExportData').then((mod) => mod.ExportData), { loading: LoadingView })
const ExamList = dynamic(() => import('@/components/exams/ExamList').then((mod) => mod.ExamList), { loading: LoadingView })
const MarkEntry = dynamic(() => import('@/components/exams/MarkEntry').then((mod) => mod.MarkEntry), { loading: LoadingView })
const ReportCards = dynamic(() => import('@/components/exams/ReportCards').then((mod) => mod.ReportCards), { loading: LoadingView })
const AttendanceMarking = dynamic(() => import('@/components/attendance/AttendanceMarking').then((mod) => mod.AttendanceMarking), { loading: LoadingView })
const NoticeList = dynamic(() => import('@/components/notices/NoticeList').then((mod) => mod.NoticeList), { loading: LoadingView })
const SettingsPage = dynamic(() => import('@/components/settings/SettingsPage').then((mod) => mod.SettingsPage), { loading: LoadingView })
const CalendarView = dynamic(() => import('@/components/calendar/CalendarView').then((mod) => mod.CalendarView), { loading: LoadingView })
const TeacherWorkspace = dynamic(() => import('@/components/teacher/TeacherWorkspace').then((mod) => mod.TeacherWorkspace), { loading: LoadingView })
const MessagingPage = dynamic(() => import('@/components/messaging/MessagingPage').then((mod) => mod.MessagingPage), { loading: LoadingView })
const ClassReport = dynamic(() => import('@/components/reports/ClassReport').then((mod) => mod.ClassReport), { loading: LoadingView })
const StudentPromotion = dynamic(() => import('@/components/students/StudentPromotion').then((mod) => mod.StudentPromotion), { loading: LoadingView })
const LibraryPage = dynamic(() => import('@/components/library/LibraryPage').then((mod) => mod.LibraryPage), { loading: LoadingView })
const HealthRecords = dynamic(() => import('@/components/health/HealthRecords').then((mod) => mod.HealthRecords), { loading: LoadingView })
const TransportPage = dynamic(() => import('@/components/transport/TransportPage').then((mod) => mod.TransportPage), { loading: LoadingView })
const DocumentsPage = dynamic(() => import('@/components/documents/DocumentsPage').then((mod) => mod.DocumentsPage), { loading: LoadingView })
const ActivityFeed = dynamic(() => import('@/components/activity/ActivityFeed').then((mod) => mod.ActivityFeed), { loading: LoadingView })

function ViewRouter() {
  const { currentView, user } = useAppStore()

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardHome />,
    'role-center': <RoleCenter />,
    'parent-dashboard': <ParentDashboard />,
    users: <UserManagement />,
    students: <StudentList />,
    'student-detail': <StudentDetail />,
    classes: <ClassManagement />,
    analytics: <AnalyticsPage />,
    fees: user?.role === 'PARENT' ? <ParentDashboard forcedTab="fees" /> : <FeesPage />,
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

  if (currentView === 'role-center' && user?.role === 'SUPER_ADMIN') {
    return <DashboardHome />
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
        if (!isTabAuthenticated()) {
          await authApi.logout().catch(() => null)
          clearTabAuthenticated()
          if (!cancelled) setUser(null)
          return
        }

        const res = await authApi.me()
        if (cancelled) return
        if (res.success && res.data) {
          touchTabAuthenticated()
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

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') touchTabAuthenticated()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated])

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
