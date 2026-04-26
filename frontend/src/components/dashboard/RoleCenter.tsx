'use client'

import {
  ShieldCheck,
  Users,
  GraduationCap,
  ClipboardCheck,
  FileText,
  Bell,
  DollarSign,
  Settings,
  BarChart3,
  School,
  MessageSquare,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type QuickAction = {
  label: string
  view: string
  icon: React.ElementType
}

type RoleConfig = {
  title: string
  summary: string
  accent: string
  capabilities: string[]
  quickActions: QuickAction[]
}

const roleConfigMap: Record<string, RoleConfig> = {
  SUPER_ADMIN: {
    title: 'Super Admin',
    summary: 'Full control across users, settings, academics, and finance.',
    accent: 'from-red-500 to-rose-600',
    capabilities: [
      'Full system access',
      'Create and delete users',
      'Manage system settings',
      'View all reports and summaries',
    ],
    quickActions: [
      { label: 'Manage Users', view: 'users', icon: Users },
      { label: 'System Settings', view: 'settings', icon: Settings },
      { label: 'Analytics', view: 'analytics', icon: BarChart3 },
      { label: 'Class Reports', view: 'class-reports', icon: FileText },
    ],
  },
  HEADTEACHER: {
    title: 'Headteacher',
    summary: 'Oversees all departments, approvals, and school-wide reporting.',
    accent: 'from-violet-500 to-indigo-600',
    capabilities: [
      'View all departments',
      'Export summary finance reports',
      'Export academic performance reports',
      'Export staff reports',
      'Export school-wide reports',
      'View audit summaries',
      'Approve sensitive operations',
    ],
    quickActions: [
      { label: 'Students', view: 'students', icon: GraduationCap },
      { label: 'Classes', view: 'classes', icon: School },
      { label: 'School Reports', view: 'class-reports', icon: FileText },
      { label: 'Data Export', view: 'export', icon: CreditCard },
      { label: 'Audit Summaries', view: 'activity', icon: BarChart3 },
      { label: 'Approvals', view: 'promotions', icon: ClipboardCheck },
      { label: 'Analytics', view: 'analytics', icon: BarChart3 },
    ],
  },
  DOS: {
    title: 'Director of Studies',
    summary: 'Owns exams, marks, and academic performance monitoring.',
    accent: 'from-indigo-500 to-sky-600',
    capabilities: [
      'Manage exams',
      'Enter and review results',
      'Monitor academic progress',
      'Oversee subject and class performance',
    ],
    quickActions: [
      { label: 'Exams', view: 'exams', icon: FileText },
      { label: 'Mark Entry', view: 'mark-entry', icon: ClipboardCheck },
      { label: 'Reports', view: 'class-reports', icon: FileText },
      { label: 'Attendance', view: 'attendance', icon: ClipboardCheck },
    ],
  },
  SECRETARY: {
    title: 'Secretary',
    summary: 'Handles office records, admissions, communication, and notices.',
    accent: 'from-cyan-500 to-teal-600',
    capabilities: [
      'Manage office records',
      'Handle admissions and student bio-data',
      'Post notices',
      'Communicate with parents and staff',
    ],
    quickActions: [
      { label: 'Students', view: 'students', icon: GraduationCap },
      { label: 'Notices', view: 'notices', icon: Bell },
      { label: 'Messages', view: 'messages', icon: MessageSquare },
      { label: 'Calendar', view: 'calendar', icon: Calendar },
    ],
  },
  BURSAR: {
    title: 'Bursar',
    summary: 'Manages school fees, receipts, balances, and finance reporting.',
    accent: 'from-emerald-500 to-green-600',
    capabilities: [
      'Record fee payments',
      'Issue receipts',
      'Track balances',
      'View finance reports and fee records',
    ],
    quickActions: [
      { label: 'Fees', view: 'fees', icon: DollarSign },
      { label: 'Export', view: 'export', icon: CreditCard },
      { label: 'Analytics', view: 'analytics', icon: BarChart3 },
      { label: 'Students', view: 'students', icon: GraduationCap },
    ],
  },
}

const roleRows = [
  { role: 'SUPER_ADMIN', scope: 'Full control', focus: 'Users, settings, whole system' },
  { role: 'HEADTEACHER', scope: 'School oversight', focus: 'All departments, approvals, audit, school-wide exports' },
  { role: 'DOS', scope: 'Academics', focus: 'Exams, marks, performance monitoring' },
  { role: 'TEACHER', scope: 'Assigned classes', focus: 'Attendance, marks, own-class reports' },
  { role: 'SECRETARY', scope: 'Office operations', focus: 'Admissions, notices, communication' },
  { role: 'BURSAR', scope: 'Finance operations', focus: 'Payments, receipts, balances, fee reports' },
  { role: 'PARENT', scope: 'Child-focused view', focus: 'Child results, fees, attendance, notices' },
]

export function RoleCenter() {
  const { user, navigateTo } = useAppStore()

  const cfg = useMemo(() => {
    if (!user?.role) return roleConfigMap.SUPER_ADMIN
    return roleConfigMap[user.role] || roleConfigMap.SUPER_ADMIN
  }, [user?.role])

  const visibleRoleRows = useMemo(() => {
    if (user?.role === 'HEADTEACHER') {
      return roleRows.filter((row) => row.role !== 'SUPER_ADMIN')
    }
    return roleRows
  }, [user?.role])

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-slate-200/60 dark:border-slate-700/60 shadow-sm">
        <CardContent className={cn('p-0 bg-gradient-to-r', cfg.accent)}>
          <div className="px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/80">Role Dashboard</p>
                <h2 className="text-xl font-semibold">{cfg.title}</h2>
                <p className="text-sm text-white/90 mt-1">{cfg.summary}</p>
              </div>
              <ShieldCheck className="w-9 h-9 text-white/90" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">What You Can Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cfg.capabilities.map((cap) => (
              <div key={cap} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                <span>{cap}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cfg.quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={`${action.view}-${action.label}`}
                  variant="outline"
                  className="justify-start h-10"
                  onClick={() => navigateTo(action.view)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/60 dark:border-slate-700/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Role Responsibility Matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleRoleRows.map((row) => (
            <div
              key={row.role}
              className="rounded-lg border border-slate-200/70 dark:border-slate-700/70 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{row.role}</Badge>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.scope}</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{row.focus}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
