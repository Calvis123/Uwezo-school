'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Calendar,
  FileText,
  MessageSquare,
  Megaphone,
  Settings,
  Activity,
  Loader2,
  Inbox,
  CheckCheck,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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

const typeConfig: Record<string, {
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
  darkBgColor: string
  borderColor: string
  darkBorderColor: string
  badgeColor: string
}> = {
  PAYMENT: {
    icon: DollarSign,
    label: 'Payments',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50',
    darkBgColor: 'dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200',
    darkBorderColor: 'dark:border-emerald-800',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  ATTENDANCE: {
    icon: Calendar,
    label: 'Attendance',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50',
    darkBgColor: 'dark:bg-sky-900/30',
    borderColor: 'border-sky-200',
    darkBorderColor: 'dark:border-sky-800',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  EXAM: {
    icon: FileText,
    label: 'Exams',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-900/30',
    borderColor: 'border-amber-200',
    darkBorderColor: 'dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  MESSAGE: {
    icon: MessageSquare,
    label: 'Messages',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50',
    darkBgColor: 'dark:bg-violet-900/30',
    borderColor: 'border-violet-200',
    darkBorderColor: 'dark:border-violet-800',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  NOTICE: {
    icon: Megaphone,
    label: 'Notices',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50',
    darkBgColor: 'dark:bg-teal-900/30',
    borderColor: 'border-teal-200',
    darkBorderColor: 'dark:border-teal-800',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  SYSTEM: {
    icon: Settings,
    label: 'System',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50',
    darkBgColor: 'dark:bg-slate-800/30',
    borderColor: 'border-slate-200',
    darkBorderColor: 'dark:border-slate-700',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
}

const filterOptions = [
  { value: 'ALL', label: 'All Activity' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'EXAM', label: 'Exams' },
  { value: 'MESSAGE', label: 'Messages' },
  { value: 'NOTICE', label: 'Notices' },
]

export function ActivityFeed() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const { setCurrentView, setNotificationCount } = useAppStore()

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationsApi.list()
      if (res.success && res.data) {
        setNotifications(res.data.notifications)
        setNotificationCount(res.data.unreadCount)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [setNotificationCount])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setNotificationCount(0)
  }

  const filteredNotifications = activeFilter === 'ALL'
    ? notifications
    : notifications.filter((n) => n.type === activeFilter)

  // Group by date
  const grouped = filteredNotifications.reduce((acc, notification) => {
    const date = new Date(notification.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let groupKey: string
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday'
    } else {
      groupKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    }

    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(notification)
    return acc
  }, {} as Record<string, Notification[]>)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Count by type
  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Activity Feed
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading ? 'Loading...' : `${notifications.length} activities`}
              {unreadCount > 0 && (
                <span className="text-teal-600 dark:text-teal-400 font-medium">
                  {' '}({unreadCount} unread)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter.value
          const count = filter.value === 'ALL'
            ? notifications.length
            : typeCounts[filter.value] || 0

          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400'
              )}
            >
              {filter.label}
              <span className={cn(
                'text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                No activity found
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                {activeFilter !== 'ALL'
                  ? `No ${typeConfig[activeFilter]?.label?.toLowerCase() || ''} activity in the last 7 days`
                  : 'No activity recorded in the last 7 days'}
              </p>
            </div>
            {activeFilter !== 'ALL' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilter('ALL')}
                className="mt-2 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800"
              >
                View all activity
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
                  {date}
                </h3>
                <div className="space-y-2">
                  {items.map((notification, index) => {
                    const config = typeConfig[notification.type] || typeConfig.SYSTEM
                    const Icon = config.icon
                    const isUnread = !notification.isRead

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                      >
                        <Card
                          className={cn(
                            'overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer group',
                            isUnread && 'ring-1 ring-teal-200 dark:ring-teal-800',
                          )}
                          onClick={() => setCurrentView(notification.link)}
                        >
                          <div className="flex items-start gap-3 p-4">
                            {/* Type Icon */}
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                              config.bgColor,
                              config.darkBgColor,
                            )}>
                              <Icon className={cn('w-5 h-5', config.color)} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h4 className={cn(
                                    'text-sm font-medium truncate',
                                    isUnread
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-700 dark:text-slate-300'
                                  )}>
                                    {notification.title}
                                  </h4>
                                  <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 flex-shrink-0', config.badgeColor)}>
                                    {notification.type}
                                  </Badge>
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                                  {notification.relativeTime}
                                </span>
                              </div>

                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                {notification.description}
                              </p>

                              {notification.actorName && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                                  {notification.type === 'MESSAGE'
                                    ? `From: ${notification.actorName}`
                                    : `By: ${notification.actorName}`}
                                </p>
                              )}

                              {/* Navigate link */}
                              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                                  View details
                                </span>
                                <ArrowRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                              </div>
                            </div>

                            {/* Unread dot */}
                            {isUnread && (
                              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
