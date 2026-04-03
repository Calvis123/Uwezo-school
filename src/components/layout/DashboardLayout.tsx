'use client'

import {
  LayoutDashboard,
  GraduationCap,
  DollarSign,
  FileText,
  ClipboardCheck,
  Bell,
  Settings,
  LogOut,
  X,
  Menu,
  Search,
  User,
  ChevronRight,
  Calendar,
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
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'exams', label: 'Exams & Results', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ADMIN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  TEACHER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  PARENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const {
    currentView,
    user,
    setCurrentView,
    logout,
  } = useAppStore()

  return (
    <div className="flex flex-col h-full">
      {/* Logo / School Name */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700/60">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">Olives</h1>
            <span className="text-sm font-bold text-teal-600 dark:text-teal-400 leading-tight">School</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Management System</p>
        </div>
      </div>

      {/* School Year/Term Indicator */}
      <div className="px-4 py-2.5 bg-teal-50/50 dark:bg-teal-900/20 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Calendar className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          <span className="font-medium text-teal-700 dark:text-teal-300">2025 Academic Year</span>
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="text-slate-600 dark:text-slate-400">Term 1</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Navigation</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
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
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group',
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-l-[3px] border-teal-600 dark:border-teal-400 pl-[9px]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border-l-[3px] border-transparent pl-[9px]'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-200 dark:bg-slate-700/60" />

      {/* User info at bottom */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
            <AvatarFallback className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              {user?.name
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
            <Badge
              variant="secondary"
              className={cn('text-[9px] px-1.5 py-0 font-medium', roleColors[user?.role || ''] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300')}
            >
              {roleLabels[user?.role || ''] || user?.role || 'User'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={logout}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
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
        <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={closeMobile} />
        </Sheet>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-full flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}

// View titles and breadcrumbs mapping
const viewInfo: Record<string, { title: string; breadcrumbs?: string[] }> = {
  dashboard: { title: 'Dashboard', breadcrumbs: ['Dashboard'] },
  students: { title: 'Students', breadcrumbs: ['Dashboard', 'Students'] },
  'student-detail': { title: 'Student Details', breadcrumbs: ['Dashboard', 'Students', 'Details'] },
  fees: { title: 'Fees Management', breadcrumbs: ['Dashboard', 'Fees'] },
  exams: { title: 'Exams & Results', breadcrumbs: ['Dashboard', 'Exams'] },
  'mark-entry': { title: 'Mark Entry', breadcrumbs: ['Dashboard', 'Exams', 'Mark Entry'] },
  'report-cards': { title: 'Report Cards', breadcrumbs: ['Dashboard', 'Exams', 'Reports'] },
  attendance: { title: 'Attendance', breadcrumbs: ['Dashboard', 'Attendance'] },
  notices: { title: 'Notices', breadcrumbs: ['Dashboard', 'Notices'] },
  settings: { title: 'Settings', breadcrumbs: ['Dashboard', 'Settings'] },
}

export function Header() {
  const { currentView, setSidebarOpen, user, navigateTo, logout } = useAppStore()
  const info = viewInfo[currentView] || { title: 'Dashboard', breadcrumbs: ['Dashboard'] }

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 h-16">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 text-slate-600 dark:text-slate-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            {/* Breadcrumbs */}
            {info.breadcrumbs && info.breadcrumbs.length > 1 ? (
              <div className="flex items-center gap-1 text-xs">
                {info.breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                    <span className={cn(
                      'text-xs',
                      i === info.breadcrumbs!.length - 1
                        ? 'text-slate-900 dark:text-slate-100 font-medium'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer'
                    )}>
                      {crumb}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {info.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search Bar (placeholder) */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <div className="h-9 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 pl-9 pr-3 flex items-center">
              <span className="text-sm text-slate-400 dark:text-slate-500">Search...</span>
              <kbd className="hidden lg:inline-flex ml-auto h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification bell */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
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
                  {user?.role}
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
              <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
