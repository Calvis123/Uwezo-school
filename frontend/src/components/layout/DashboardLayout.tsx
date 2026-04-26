'use client'

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  FileText,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  Menu,
  Search,
  User,
  ChevronRight,
  Calendar,
  MessageSquare,
  Download,
  School,
  BarChart3,
  Activity,
  HeartPulse,
  Phone,
  Mail,
  BookOpen,
  Bus,
  ArrowUpCircle,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import { clearTabAuthenticated } from '@/lib/tab-auth'
import { useMemo, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearchModal } from '@/components/search/GlobalSearchModal'
import { NotificationCenter } from './NotificationCenter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ROLE_LABELS } from '@/lib/roles'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER', 'SECRETARY', 'BURSAR', 'PARENT'] },
  { id: 'users', label: 'Users', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] },
  { id: 'students', label: 'Students', icon: GraduationCap, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'SECRETARY', 'TEACHER'] },
  { id: 'classes', label: 'Classes', icon: School, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] },
  { id: 'promotions', label: 'Promotions', icon: ArrowUpCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] },
  { id: 'teacher-dashboard', label: 'Teacher Workspace', icon: GraduationCap, roles: ['TEACHER'] },
  { id: 'role-center', label: 'Role Center', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'HEADTEACHER'] },
  { id: 'fees', label: 'Fees', icon: DollarSign, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'BURSAR', 'PARENT'] },
  { id: 'export', label: 'Export', icon: Download, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'BURSAR', 'SECRETARY'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] },
  { id: 'exams', label: 'Exams & Results', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER'] },
  { id: 'class-reports', label: 'Class Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER'] },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'TEACHER', 'SECRETARY'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER', 'SECRETARY', 'BURSAR', 'PARENT'] },
  { id: 'transport', label: 'Transport', icon: Bus, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'SECRETARY', 'BURSAR'] },
  { id: 'messages', label: 'Messages', icon: MessageSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER', 'SECRETARY', 'BURSAR', 'PARENT'] },
  { id: 'notices', label: 'Notices', icon: Bell, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'TEACHER', 'BURSAR', 'PARENT'] },
  { id: 'documents', label: 'Documents', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR', 'TEACHER'] },
  { id: 'library', label: 'Library', icon: BookOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'SECRETARY', 'TEACHER'] },
  { id: 'health', label: 'Health', icon: HeartPulse, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'SECRETARY', 'TEACHER'] },
  { id: 'activity', label: 'Activity', icon: Activity, roles: ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR', 'TEACHER'] },
] as const;

const sectionByViewId: Record<string, 'Main' | 'Academics' | 'Operations' | 'Communication' | 'System'> = {
  dashboard: 'Main',
  'teacher-dashboard': 'Main',
  'role-center': 'Main',
  users: 'Main',
  students: 'Academics',
  classes: 'Academics',
  promotions: 'Academics',
  exams: 'Academics',
  'class-reports': 'Academics',
  attendance: 'Academics',
  fees: 'Operations',
  transport: 'Operations',
  library: 'Operations',
  health: 'Operations',
  export: 'Operations',
  analytics: 'Operations',
  activity: 'Operations',
  calendar: 'Communication',
  messages: 'Communication',
  notices: 'Communication',
  documents: 'Communication',
  settings: 'System',
}

const sectionOrder: Array<'Main' | 'Academics' | 'Operations' | 'Communication' | 'System'> = [
  'Main',
  'Academics',
  'Operations',
  'Communication',
  'System',
]

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ADMIN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  HEADTEACHER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  DOS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  TEACHER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  SECRETARY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  BURSAR: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PARENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const {
    currentView,
    user,
    setCurrentView,
  } = useAppStore()
  const [navQuery, setNavQuery] = useState('')

  const getRoleNavLabel = (id: string, fallback: string) => {
    if (user?.role === 'BURSAR') {
      if (id === 'dashboard') return 'Bursar Dashboard'
      if (id === 'export') return 'Finance Export'
      if (id === 'calendar') return 'Payment Calendar'
      if (id === 'messages') return 'Finance Messages'
      if (id === 'transport') return 'Transport Fees'
      if (id === 'notices') return 'Fee Notices'
      if (id === 'activity') return 'Finance Activity'
    }
    if (user?.role === 'HEADTEACHER') {
      if (id === 'dashboard') return 'Headteacher Dashboard'
      if (id === 'activity') return 'Audit Summaries'
      if (id === 'export') return 'School Export Center'
    }
    return fallback
  }

  const visibleNavItems = useMemo(() => {
    const q = navQuery.trim().toLowerCase()
    return navItems.filter((item) => {
      if (user?.role && !item.roles.includes(user.role as any)) return false
      const label = getRoleNavLabel(item.id, item.label)
      if (!q) return true
      return label.toLowerCase().includes(q)
    })
  }, [navQuery, user?.role])

  const groupedNav = useMemo(() => {
    const groups: Record<string, typeof visibleNavItems> = {}
    for (const item of visibleNavItems) {
      const section = sectionByViewId[item.id] || 'Main'
      if (!groups[section]) groups[section] = []
      groups[section].push(item)
    }
    return groups
  }, [visibleNavItems])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Logo / School Name */}
      <div className="relative shrink-0 flex items-center gap-3 px-4 py-4 border-b border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-r from-teal-50/70 via-white to-white dark:from-teal-950/25 dark:via-slate-900 dark:to-slate-900">
        <img src="/logo.png" alt="Olives Schools" className="w-10 h-10 rounded-xl flex-shrink-0 shadow-md object-contain" />
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Olives</h1>
            <span className="text-sm font-bold text-teal-600 dark:text-teal-400 leading-tight">Schools</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Management System</p>
        </div>
      </div>

      {/* School Year/Term Indicator */}
      <div className="shrink-0 px-4 py-2.5 bg-teal-50/50 dark:bg-teal-900/20 border-b border-slate-200/80 dark:border-slate-700/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
          <Calendar className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          <span className="font-medium text-teal-700 dark:text-teal-300">2025 Academic Year</span>
            <span className="text-slate-400 dark:text-slate-500">-</span>
          <span className="text-slate-600 dark:text-slate-400">Term 1</span>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'text-[9px] px-1.5 py-0 font-medium',
              roleColors[user?.role || ''] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            {ROLE_LABELS[user?.role || ''] || user?.role || 'User'}
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 py-3">
        <div className="mb-2 px-2">
          <label htmlFor="sidebar-nav-search" className="sr-only">Search navigation</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              id="sidebar-nav-search"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Quick find page..."
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/70 pl-9 pr-3 text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/70"
            />
          </div>
        </div>
        {sectionOrder.map((section) => {
          const items = groupedNav[section] || []
          if (!items.length) return null
          return (
            <div key={section} className="mb-2.5">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">{section}</p>
              <nav className="space-y-0.5" aria-label={`${section} navigation`}>
                {items.map((item) => {
            const Icon = item.icon
            const isActive =
              currentView === item.id ||
              (item.id === 'students' && currentView === 'student-detail') ||
              (item.id === 'exams' && (currentView === 'mark-entry' || currentView === 'report-cards'))
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id)
                  onNavigate?.()
                }}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={getRoleNavLabel(item.id, item.label)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out relative group focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2',
                  isActive
                    ? 'bg-gradient-to-r from-teal-50 to-teal-100/70 dark:from-teal-900/35 dark:to-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-700/60 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                )}
              >
                <span
                  className={cn(
                    'absolute left-1.5 h-5 w-1 rounded-full transition-all',
                    isActive ? 'bg-teal-500 dark:bg-teal-400' : 'bg-transparent'
                  )}
                />
                <Icon
                  className={cn(
                    'w-[17px] h-[17px] flex-shrink-0 transition-colors duration-200',
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1 text-left">{getRoleNavLabel(item.id, item.label)}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                )}
              </button>
            )
                })}
              </nav>
            </div>
          )
        })}
        {visibleNavItems.length === 0 && (
          <div className="px-3 py-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            No pages match your search.
          </div>
        )}
        <div className="h-2" />
      </ScrollArea>
      </div>

      <Separator className="bg-slate-200/80 dark:bg-slate-700/60" />

      {/* User info at bottom */}
      <div className="shrink-0 p-3.5 space-y-2.5 bg-white/70 dark:bg-slate-900/40">
        <div className="rounded-xl border border-teal-100/80 dark:border-teal-900/40 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-teal-700/80 dark:text-teal-300/80">School Motto</p>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 mt-1">Nurturing Knowledge, Character & Excellence</p>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-0.5 leading-relaxed">
          Building future leaders through discipline, service, and academic growth.
        </p>
      </div>
    </div>
  )
}

export function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
  } = useAppStore()

  const closeMobile = () => setSidebarOpen(false)

  return (
    <>
      {/* Mobile Sheet/Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800">
          <SheetTitle className="sr-only">Main Navigation</SheetTitle>
          <SidebarContent onNavigate={closeMobile} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar - Glass effect */}
      <aside className="hidden lg:flex w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-r border-slate-200/80 dark:border-slate-800/80 flex-col h-full flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}

// View titles and breadcrumbs mapping
const viewInfo: Record<string, { title: string; breadcrumbs?: string[] }> = {
  dashboard: { title: 'Dashboard', breadcrumbs: ['Dashboard'] },
  users: { title: 'Users', breadcrumbs: ['Dashboard', 'Users'] },
  students: { title: 'Students', breadcrumbs: ['Dashboard', 'Students'] },
  'student-detail': { title: 'Student Details', breadcrumbs: ['Dashboard', 'Students', 'Details'] },
  fees: { title: 'Fees Management', breadcrumbs: ['Dashboard', 'Fees'] },
  export: { title: 'Data Export', breadcrumbs: ['Dashboard', 'Export'] },
  exams: { title: 'Exams & Results', breadcrumbs: ['Dashboard', 'Exams'] },
  'mark-entry': { title: 'Mark Entry', breadcrumbs: ['Dashboard', 'Exams', 'Mark Entry'] },
  'report-cards': { title: 'Report Cards', breadcrumbs: ['Dashboard', 'Exams', 'Reports'] },
  'class-reports': { title: 'Class Reports', breadcrumbs: ['Dashboard', 'Class Reports'] },
  attendance: { title: 'Attendance', breadcrumbs: ['Dashboard', 'Attendance'] },
  calendar: { title: 'Calendar', breadcrumbs: ['Dashboard', 'Calendar'] },
  analytics: { title: 'Analytics', breadcrumbs: ['Dashboard', 'Analytics'] },
  classes: { title: 'Class Management', breadcrumbs: ['Dashboard', 'Classes'] },
  promotions: { title: 'Student Promotion', breadcrumbs: ['Dashboard', 'Promotions'] },
  messages: { title: 'Messages', breadcrumbs: ['Dashboard', 'Messages'] },
  'teacher-dashboard': { title: 'Teacher Workspace', breadcrumbs: ['Dashboard', 'Teacher Workspace'] },
  'role-center': { title: 'Role Center', breadcrumbs: ['Dashboard', 'Role Center'] },
  notices: { title: 'Notices', breadcrumbs: ['Dashboard', 'Notices'] },
  documents: { title: 'Documents', breadcrumbs: ['Dashboard', 'Documents'] },
  activity: { title: 'Activity Feed', breadcrumbs: ['Dashboard', 'Activity'] },
  library: { title: 'Library', breadcrumbs: ['Dashboard', 'Library'] },
  health: { title: 'Health Records', breadcrumbs: ['Dashboard', 'Health'] },
  transport: { title: 'Transport', breadcrumbs: ['Dashboard', 'Transport'] },
  settings: { title: 'Settings', breadcrumbs: ['Dashboard', 'Settings'] },
}

export function Header({ onSearchOpen }: { onSearchOpen: () => void }) {
  const { currentView, setSidebarOpen, user, navigateTo, logout } = useAppStore()
  const info = viewInfo[currentView] || { title: 'Dashboard', breadcrumbs: ['Dashboard'] }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearTabAuthenticated()
      logout()
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-6 h-16">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 text-slate-600 dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-teal-500"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            {/* Breadcrumbs */}
            {info.breadcrumbs && info.breadcrumbs.length > 1 ? (
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-1 text-xs">
                  {info.breadcrumbs.map((crumb, i) => (
                    <li key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
                      <span className={cn(
                        'text-xs transition-colors',
                        i === info.breadcrumbs!.length - 1
                          ? 'text-slate-900 dark:text-slate-100 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      )} aria-current={i === info.breadcrumbs!.length - 1 ? 'page' : undefined}>
                        {crumb}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {info.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search Bar - clickable to open dialog */}
          <button
            onClick={onSearchOpen}
            type="button"
            aria-label="Open global search"
            className="hidden md:flex items-center relative h-9 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm pl-9 pr-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-sm text-slate-400 dark:text-slate-500">Search...</span>
            <kbd className="hidden lg:inline-flex ml-auto h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 shadow-sm">
              Ctrl+K
            </kbd>
          </button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
            onClick={onSearchOpen}
            aria-label="Open global search"
          >
            <Search className="w-[18px] h-[18px]" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification bell - with live count from API */}
          <NotificationCenter />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 focus-visible:outline-2 focus-visible:outline-teal-500" aria-label="Open user menu">
                <Avatar className="h-8 w-8 ring-2 ring-slate-100 dark:ring-slate-700">
                  <AvatarFallback className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                    {user?.name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                <Badge
                  variant="secondary"
                  className="mt-1 text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                >
                  {ROLE_LABELS[user?.role || ''] || user?.role}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigateTo('settings')} className="text-slate-700 dark:text-slate-300">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('settings')} className="text-slate-700 dark:text-slate-300">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function DashboardFooter() {
  return (
    <footer className="mt-auto pt-6 pb-2">
      <div className="border-t border-slate-200/60 dark:border-slate-700/40 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Olives Schools"
              className="w-6 h-6 rounded-md object-contain flex-shrink-0"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              (c) 2025 Olives Schools - Eldoret, Kenya
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              +254 700 123 456
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Mail className="w-3 h-3" />
              info@olives.co.ke
            </span>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-2">
          Made in Kenya
        </p>
      </div>
    </footer>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-teal-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onSearchOpen={() => setSearchOpen(true)} />
        <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
        {/* Main content area with teal-to-transparent top gradient border */}
        <main id="main-content" className="flex-1 overflow-y-auto relative" tabIndex={-1}>
          <div className="h-px bg-gradient-to-r from-teal-500 via-teal-300/50 to-transparent absolute top-0 left-0 right-0 z-10" />
          <div className="relative p-4 lg:p-6 min-h-full flex flex-col">
            <div className="flex-1">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
            <DashboardFooter />
          </div>
        </main>
      </div>
    </div>
  )
}

