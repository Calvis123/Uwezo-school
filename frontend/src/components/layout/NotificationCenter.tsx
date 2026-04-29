'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell,
  CheckCheck,
  DollarSign,
  ClipboardCheck,
  MessageSquare,
  FileText,
  BellRing,
  Settings,
  Loader2,
  CircleCheckBig,
  Clock,
  CalendarClock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/lib/store'
import { notificationsApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────

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
  timeGroup: 'today' | 'yesterday' | 'earlier'
}

interface GroupedNotifications {
  today: Notification[]
  yesterday: Notification[]
  earlier: Notification[]
}

interface NotificationResponse {
  notifications: Notification[]
  grouped: GroupedNotifications
  unreadCount: number
  totalCount: number
}

const localStorageKeys = {
  allReadAt: (userId: string) => `uwezo_school_notifications_all_read_at_${userId}`,
  readIds: (userId: string) => `uwezo_school_notifications_read_ids_${userId}`,
}

// ── Notification Type Config ───────────────────────────────────────
// Matches the required icons and colors from the task spec

const typeConfig: Record<
  string,
  {
    icon: React.ElementType
    color: string
    bgColor: string
    darkBgColor: string
    ringColor: string
    label: string
    borderColor: string
    hoverBorder: string
  }
> = {
  PAYMENT: {
    icon: DollarSign,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50',
    darkBgColor: 'dark:bg-teal-900/30',
    ringColor: 'ring-teal-500/20',
    label: 'Fee Payment',
    borderColor: 'border-l-teal-500',
    hoverBorder: 'hover:border-l-teal-400',
  },
  ATTENDANCE: {
    icon: ClipboardCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-900/30',
    ringColor: 'ring-amber-500/20',
    label: 'Attendance',
    borderColor: 'border-l-amber-500',
    hoverBorder: 'hover:border-l-amber-400',
  },
  MESSAGE: {
    icon: MessageSquare,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50',
    darkBgColor: 'dark:bg-sky-900/30',
    ringColor: 'ring-sky-500/20',
    label: 'Message',
    borderColor: 'border-l-sky-500',
    hoverBorder: 'hover:border-l-sky-400',
  },
  EXAM: {
    icon: FileText,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50',
    darkBgColor: 'dark:bg-violet-900/30',
    ringColor: 'ring-violet-500/20',
    label: 'Exam Results',
    borderColor: 'border-l-violet-500',
    hoverBorder: 'hover:border-l-violet-400',
  },
  NOTICE: {
    icon: BellRing,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50',
    darkBgColor: 'dark:bg-teal-900/30',
    ringColor: 'ring-teal-500/20',
    label: 'Notice',
    borderColor: 'border-l-teal-500',
    hoverBorder: 'hover:border-l-teal-400',
  },
  SYSTEM: {
    icon: Settings,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50',
    darkBgColor: 'dark:bg-slate-800/30',
    ringColor: 'ring-slate-500/20',
    label: 'System',
    borderColor: 'border-l-slate-400',
    hoverBorder: 'hover:border-l-slate-400',
  },
}

// ── Time Group Config ──────────────────────────────────────────────

const timeGroupConfig: Record<string, { label: string; icon: React.ElementType }> = {
  today: { label: 'Today', icon: Clock },
  yesterday: { label: 'Yesterday', icon: CalendarClock },
  earlier: { label: 'Earlier', icon: Clock },
}

// ── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -8, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
}

const badgeVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 },
  },
}

const headerVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// ── Notification Item ──────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: Notification
  onMarkRead: (id: string, e: React.MouseEvent) => void
  onClick: (notification: Notification) => void
}) {
  const config = typeConfig[notification.type] || typeConfig.SYSTEM
  const Icon = config.icon
  const isUnread = !notification.isRead

  return (
    <motion.div
      variants={itemVariants}
      layout
      role="button"
      tabIndex={0}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(notification)
        }
      }}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-200 relative group rounded-lg mx-1 my-0.5 border-l-[3px]',
        config.borderColor,
        isUnread
          ? `bg-teal-50/60 dark:bg-teal-900/15 ${config.hoverBorder} dark:hover:border-l-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/25`
          : `${config.hoverBorder} dark:hover:border-l-teal-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/50`
      )}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <motion.span
          layoutId={`dot-${notification.id}`}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-teal-500"
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      )}

      {/* Type Icon */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-200',
          config.bgColor,
          config.darkBgColor,
          isUnread && 'ring-2 ' + config.ringColor
        )}
      >
        <Icon className={cn('w-[18px] h-[18px]', config.color)} />
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug line-clamp-1',
              isUnread
                ? 'font-semibold text-slate-900 dark:text-slate-100'
                : 'font-medium text-slate-600 dark:text-slate-400'
            )}
          >
            {notification.title}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0 mt-0.5">
            {notification.relativeTime}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.description}
        </p>
        {notification.actorName && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            {notification.actorName}
          </p>
        )}
      </div>

      {/* Mark as read button (visible on hover for unread) */}
      {isUnread && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className="absolute right-2 top-2 w-6 h-6 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
          onClick={(e) => onMarkRead(notification.id, e)}
          title="Mark as read"
        >
          <CheckCheck className="w-3 h-3" />
        </motion.button>
      )}
      </motion.div>
  )
}

// ── Notification Group ─────────────────────────────────────────────

function NotificationGroup({
  label,
  icon: GroupIcon,
  notifications,
  onMarkRead,
  onClick,
}: {
  label: string
  icon: React.ElementType
  notifications: Notification[]
  onMarkRead: (id: string, e: React.MouseEvent) => void
  onClick: (notification: Notification) => void
}) {
  if (notifications.length === 0) return null

  return (
    <div>
      {/* Group Header */}
      <div className="flex items-center gap-2 px-5 py-2">
        <GroupIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onClick={onClick}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-14 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 flex items-center justify-center mb-4 shadow-sm"
      >
        <CircleCheckBig className="w-8 h-8 text-teal-500 dark:text-teal-400" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-sm font-semibold text-slate-800 dark:text-slate-200"
      >
        You're all caught up!
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center max-w-[200px]"
      >
        No new notifications at the moment. We'll let you know when something arrives.
      </motion.p>
    </motion.div>
  )
}

// ── Loading State ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Loading notifications...
      </p>
    </div>
  )
}

// ── Main NotificationCenter ────────────────────────────────────────

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [grouped, setGrouped] = useState<GroupedNotifications>({
    today: [],
    yesterday: [],
    earlier: [],
  })
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const { user, setNotificationCount, setCurrentView } = useAppStore()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasFetchedRef = useRef(false)

  const getLocalAllReadAt = useCallback((): number => {
    if (!user?.id || typeof window === 'undefined') return 0
    const raw = window.localStorage.getItem(localStorageKeys.allReadAt(user.id))
    const parsed = raw ? Number(raw) : 0
    return Number.isFinite(parsed) ? parsed : 0
  }, [user?.id])

  const getLocalReadIds = useCallback((): Set<string> => {
    if (!user?.id || typeof window === 'undefined') return new Set<string>()
    try {
      const raw = window.localStorage.getItem(localStorageKeys.readIds(user.id))
      if (!raw) return new Set<string>()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return new Set<string>()
      return new Set(parsed.filter((v) => typeof v === 'string'))
    } catch {
      return new Set<string>()
    }
  }, [user?.id])

  const persistLocalReadIds = useCallback((ids: Set<string>) => {
    if (!user?.id || typeof window === 'undefined') return
    window.localStorage.setItem(localStorageKeys.readIds(user.id), JSON.stringify(Array.from(ids)))
  }, [user?.id])

  const markLocalReadId = useCallback((id: string) => {
    const ids = getLocalReadIds()
    ids.add(id)
    persistLocalReadIds(ids)
  }, [getLocalReadIds, persistLocalReadIds])

  const markLocalAllReadNow = useCallback((): number => {
    const now = Date.now()
    if (!user?.id || typeof window === 'undefined') return now
    window.localStorage.setItem(localStorageKeys.allReadAt(user.id), String(now))
    return now
  }, [user?.id])

  const applyLocalReadState = useCallback((items: Notification[]): Notification[] => {
    const localAllReadAt = getLocalAllReadAt()
    const localReadIds = getLocalReadIds()
    return items.map((n) => {
      const ts = new Date(n.timestamp).getTime()
      const readByAll = Number.isFinite(ts) && localAllReadAt > 0 && ts <= localAllReadAt
      const readById = localReadIds.has(n.id)
      return {
        ...n,
        isRead: n.isRead || readByAll || readById,
      }
    })
  }, [getLocalAllReadAt, getLocalReadIds])

  const groupByTime = useCallback((items: Notification[]): GroupedNotifications => ({
    today: items.filter((n) => n.timeGroup === 'today'),
    yesterday: items.filter((n) => n.timeGroup === 'yesterday'),
    earlier: items.filter((n) => n.timeGroup === 'earlier'),
  }), [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      if (!user?.id) return
      const res = await notificationsApi.list(user.id)
      if (res.success && res.data) {
        const data = res.data as NotificationResponse
        const mergedNotifications = applyLocalReadState(data.notifications)
        const mergedGrouped = groupByTime(mergedNotifications)
        const mergedUnreadCount = mergedNotifications.filter((n) => !n.isRead).length
        setNotifications(mergedNotifications)
        setGrouped(mergedGrouped)
        setUnreadCount(mergedUnreadCount)
        setNotificationCount(mergedUnreadCount)
        hasFetchedRef.current = true
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [user?.id, setNotificationCount, applyLocalReadState, groupByTime])

  // Fetch when popover opens + auto-refresh every 60s
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }

    pollRef.current = setInterval(fetchNotifications, 60000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open, fetchNotifications])

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return
    setMarkingAllRead(true)
    const allReadAt = markLocalAllReadNow()
    try {
      const res = await notificationsApi.markAllRead()
      const shouldApplyLocalOnly = !res.success
      setNotifications((prev) =>
        prev.map((n) => {
          const ts = new Date(n.timestamp).getTime()
          const shouldMarkRead = Number.isFinite(ts) ? ts <= allReadAt : true
          return shouldMarkRead ? { ...n, isRead: true } : n
        })
      )
      setGrouped((prev) => ({
        today: prev.today.map((n) => {
          const ts = new Date(n.timestamp).getTime()
          return Number.isFinite(ts) && ts <= allReadAt ? { ...n, isRead: true } : n
        }),
        yesterday: prev.yesterday.map((n) => {
          const ts = new Date(n.timestamp).getTime()
          return Number.isFinite(ts) && ts <= allReadAt ? { ...n, isRead: true } : n
        }),
        earlier: prev.earlier.map((n) => {
          const ts = new Date(n.timestamp).getTime()
          return Number.isFinite(ts) && ts <= allReadAt ? { ...n, isRead: true } : n
        }),
      }))
      setUnreadCount(0)
      setNotificationCount(0)
      if (!shouldApplyLocalOnly) {
        await fetchNotifications()
      }
    } catch {
      // Keep local read state even if API fails.
    } finally {
      setMarkingAllRead(false)
    }
  }

  const markNotificationRead = useCallback(async (id: string) => {
    if (markingRead === id) return
    setMarkingRead(id)
    markLocalReadId(id)
    try {
      const res = await notificationsApi.markRead(id)
      if (!res.success) {
        // Keep local read state even when backend update fails.
      }
      const updateNotif = (n: Notification) =>
        n.id === id ? { ...n, isRead: true } : n
      setNotifications((prev) => prev.map(updateNotif))
      setGrouped((prev) => ({
        today: prev.today.map(updateNotif),
        yesterday: prev.yesterday.map(updateNotif),
        earlier: prev.earlier.map(updateNotif),
      }))
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1)
        setNotificationCount(next)
        return next
      })
    } catch {
      // Keep local read state even when backend update fails.
    } finally {
      setMarkingRead(null)
    }
  }, [markingRead, setNotificationCount, markLocalReadId])

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await markNotificationRead(id)
  }

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      void markNotificationRead(notification.id)
    }
    setCurrentView(notification.link)
    setOpen(false)
  }

  const handleViewAll = () => {
    setCurrentView('notices')
    setOpen(false)
  }

  const totalNotifications = notifications.length
  const hasNotifications = totalNotifications > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500 focus-visible:outline-offset-2 transition-all duration-200"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-[18px] h-[18px] transition-transform duration-200" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                variants={badgeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
              >
                {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(26rem,calc(100vw-1rem))] p-0 shadow-xl border-slate-200/80 dark:border-slate-700/80 overflow-hidden rounded-xl"
      >
        {/* ── Header ── */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/80"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                Notifications
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {hasNotifications
                  ? `${unreadCount} unread of ${totalNotifications} total`
                  : 'No new notifications'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingAllRead}
              className="h-7 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 font-medium gap-1 transition-all duration-200"
              onClick={handleMarkAllRead}
            >
              {markingAllRead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
          )}
        </motion.div>

        {/* ── Notification List ── */}
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          {loading && !hasFetchedRef.current ? (
            <LoadingState />
          ) : !hasNotifications ? (
            <EmptyState />
          ) : (
            <div className="py-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key="grouped-list"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  {/* Today */}
                  <NotificationGroup
                    label="Today"
                    icon={timeGroupConfig.today.icon}
                    notifications={grouped.today}
                    onMarkRead={handleMarkRead}
                    onClick={handleClick}
                  />

                  {/* Yesterday */}
                  {grouped.today.length > 0 && grouped.yesterday.length > 0 && (
                    <Separator className="my-1 mx-4 bg-slate-100 dark:bg-slate-800/60" />
                  )}
                  <NotificationGroup
                    label="Yesterday"
                    icon={timeGroupConfig.yesterday.icon}
                    notifications={grouped.yesterday}
                    onMarkRead={handleMarkRead}
                    onClick={handleClick}
                  />

                  {/* Earlier */}
                  {(grouped.today.length > 0 || grouped.yesterday.length > 0) &&
                    grouped.earlier.length > 0 && (
                      <Separator className="my-1 mx-4 bg-slate-100 dark:bg-slate-800/60" />
                    )}
                  <NotificationGroup
                    label="Earlier"
                    icon={timeGroupConfig.earlier.icon}
                    notifications={grouped.earlier}
                    onMarkRead={handleMarkRead}
                    onClick={handleClick}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* ── Footer ── */}
        <>
          <Separator />
          <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/30">
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors duration-200 group"
            >
              <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              View all notifications
              <ChevronRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </>
      </PopoverContent>
    </Popover>
  )
}
