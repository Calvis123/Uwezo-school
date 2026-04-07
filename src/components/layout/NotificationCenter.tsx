'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, CheckCheck, DollarSign, Calendar, FileText, MessageSquare, Megaphone, Settings, Loader2, Inbox, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { notificationsApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: 'PAYMENT' | 'ATTENDANCE' | 'EXAM' | 'MESSAGE' | 'NOTICE' | 'SYSTEM'
  title: string
  description: string
  timestamp: string
  relativeTime: string
  isRead: boolean
  link: string
  actorName?: string
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; darkBgColor: string; label: string }> = {
  PAYMENT: { icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50', darkBgColor: 'dark:bg-emerald-900/30', label: 'Payments' },
  ATTENDANCE: { icon: Calendar, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50', darkBgColor: 'dark:bg-sky-900/30', label: 'Attendance' },
  EXAM: { icon: FileText, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50', darkBgColor: 'dark:bg-amber-900/30', label: 'Exams' },
  MESSAGE: { icon: MessageSquare, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50', darkBgColor: 'dark:bg-violet-900/30', label: 'Messages' },
  NOTICE: { icon: Megaphone, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50', darkBgColor: 'dark:bg-teal-900/30', label: 'Notices' },
  SYSTEM: { icon: Settings, color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-50', darkBgColor: 'dark:bg-slate-800/30', label: 'System' },
}

type FilterTab = 'ALL' | 'PAYMENT' | 'ATTENDANCE' | 'EXAM' | 'MESSAGE' | 'NOTICE'

const tabs: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'All', icon: Inbox },
  { id: 'PAYMENT', label: 'Payments', icon: DollarSign },
  { id: 'ATTENDANCE', label: 'Attendance', icon: Calendar },
  { id: 'EXAM', label: 'Exams', icon: FileText },
  { id: 'MESSAGE', label: 'Messages', icon: MessageSquare },
]

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const { user, setNotificationCount, setCurrentView } = useAppStore()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasFetchedRef = useRef(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      if (!user?.id) return
      const res = await notificationsApi.list(user.id)
      if (res.success && res.data) {
        setNotifications(res.data.notifications)
        setNotificationCount(res.data.unreadCount)
        hasFetchedRef.current = true
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [setNotificationCount])

  // Fetch on open and start polling
  useEffect(() => {
    if (open && !hasFetchedRef.current) {
      fetchNotifications()
    }

    pollRef.current = setInterval(fetchNotifications, 30000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open, fetchNotifications])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    const allIds = new Set(notifications.map((n) => n.id))
    setReadIds(allIds)
    setNotificationCount(0)
  }

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id)
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const handleClick = (notification: Notification) => {
    handleMarkRead(notification.id)
    setCurrentView(notification.link)
    setOpen(false)
  }

  // Compute effective unread count
  const effectiveUnreadCount = notifications.filter((n) => !n.isRead && !readIds.has(n.id)).length

  // Filtered notifications based on active tab
  const filteredNotifications = activeTab === 'ALL'
    ? notifications
    : notifications.filter((n) => n.type === activeTab)

  // Count per type
  const typeCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {})

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          <Bell className="w-[18px] h-[18px]" />
          {effectiveUnreadCount > 0 && (
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
            >
              {effectiveUnreadCount > 9 ? '9+' : effectiveUnreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[22rem] sm:w-96 p-0 shadow-xl border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/80">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </h3>
            {effectiveUnreadCount > 0 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-full"
              >
                {effectiveUnreadCount} new
              </motion.span>
            )}
          </div>
          {effectiveUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = tab.id === 'ALL' ? notifications.length : typeCounts[tab.id] || 0
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap',
                  isActive
                    ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-1',
                    isActive
                      ? 'bg-teal-200 dark:bg-teal-800/60 text-teal-800 dark:text-teal-200'
                      : 'bg-slate-200 dark:bg-slate-600/50 text-slate-600 dark:text-slate-300'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Notification List */}
        <div className="max-h-[28rem] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {activeTab === 'ALL' ? (
                  <Inbox className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                ) : (
                  <Filter className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {activeTab === 'ALL' ? 'No notifications' : `No ${typeConfig[activeTab]?.label || ''} notifications`}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {activeTab === 'ALL'
                    ? "You're all caught up!"
                    : `Try selecting a different filter`
                  }
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification, index) => {
                const config = typeConfig[notification.type] || typeConfig.SYSTEM
                const Icon = config.icon
                const isUnread = !notification.isRead && !readIds.has(notification.id)

                return (
                  <motion.button
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                    transition={{ delay: Math.min(index, 5) * 0.03, duration: 0.15 }}
                    onClick={() => handleClick(notification)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-200 relative group border-l-2',
                      isUnread
                        ? 'bg-teal-50/50 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-l-teal-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-transparent'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105',
                      config.bgColor,
                      config.darkBgColor
                    )}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-sm leading-tight truncate',
                          isUnread
                            ? 'font-semibold text-slate-900 dark:text-slate-100'
                            : 'font-medium text-slate-600 dark:text-slate-400'
                        )}>
                          {notification.title}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {notification.relativeTime}
                        </p>
                        {notification.actorName && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                              {notification.actorName}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => {
                  setCurrentView('notices')
                  setOpen(false)
                }}
                className="w-full text-center text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
