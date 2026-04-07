'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { LoginPage } from '@/components/auth/LoginPage'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardHome } from '@/components/dashboard/DashboardHome'
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
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLoader } from '@/components/layout/AppLoader'

function ViewRouter() {
  const { currentView } = useAppStore()

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardHome />,
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
    'teacher-dashboard': <TeacherDashboard />,
    messages: <MessagingPage />,
    notices: <NoticeList />,
    library: <LibraryPage />,
    health: <HealthRecords />,
    transport: <TransportPage />,
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
  const { isAuthenticated, currentView } = useAppStore()
  const [mounted, setMounted] = useState(false)

  // Show loader on first render to avoid hydration flash
  if (!mounted) {
    setMounted(true)
    return <AppLoader />
  }

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
