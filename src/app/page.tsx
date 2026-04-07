'use client'

import { useEffect } from 'react'
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
import { FeesPage } from '@/components/fees/FeesPage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'

function ViewRouter() {
  const { currentView } = useAppStore()

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardHome />,
    users: <UserManagement />,
    students: <StudentList />,
    'student-detail': <StudentDetail />,
    fees: <FeesPage />,
    export: <ExportData />,
    exams: <ExamsPage />,
    'mark-entry': <MarkEntry />,
    'report-cards': <ReportCards />,
    attendance: <AttendanceMarking />,
    calendar: <CalendarView />,
    'teacher-dashboard': <TeacherDashboard />,
    messages: <MessagingPage />,
    notices: <NoticeList />,
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

  if (!isAuthenticated || currentView === 'login') {
    return <LoginPage />
  }

  return (
    <DashboardLayout>
      <ViewRouter />
    </DashboardLayout>
  )
}
