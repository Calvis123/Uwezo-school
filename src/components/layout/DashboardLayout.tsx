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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'exams', label: 'Exams & Results', icon: FileText },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const {
    currentView,
    sidebarOpen,
    user,
    setCurrentView,
    setSidebarOpen,
    logout,
  } = useAppStore()

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700',
    ADMIN: 'bg-teal-100 text-teal-700',
    TEACHER: 'bg-blue-100 text-blue-700',
    PARENT: 'bg-amber-100 text-amber-700',
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / School Name */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">Olives School</h1>
              <p className="text-[10px] text-slate-500 leading-tight">Management System</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
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
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-teal-600' : 'text-slate-400'
                    )}
                  />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User info at bottom */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {user?.name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <Badge
                variant="secondary"
                className={cn('text-[10px] px-1.5 py-0', roleColors[user?.role || ''] || '')}
              >
                {user?.role || 'User'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-red-500"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

// View titles mapping
const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  students: 'Students',
  'student-detail': 'Student Details',
  fees: 'Fees Management',
  exams: 'Exams & Results',
  'mark-entry': 'Mark Entry',
  'report-cards': 'Report Cards',
  attendance: 'Attendance',
  notices: 'Notices',
  settings: 'Settings',
}

export function Header() {
  const { currentView, setSidebarOpen, user, navigateTo, logout } = useAppStore()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 h-16">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-900">
            {viewTitles[currentView] || 'Dashboard'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold">
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
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigateTo('settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
