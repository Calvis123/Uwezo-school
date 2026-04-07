'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Calendar,
  FileText,
  Megaphone,
  Activity,
  Loader2,
  Inbox,
  RefreshCw,
  Clock,
  UserCircle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { activityApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  user: string
  timestamp: string
  relativeTime: string
  icon: string
  color: string
  initials: string
  receiptNumber?: string
  amount?: number
  method?: string
  status?: string
  marks?: number
  subject?: string
  exam?: string
  category?: string
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
  avatarBg: string
  darkAvatarBg: string
  avatarText: string
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
    avatarBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    avatarText: 'text-emerald-700 dark:text-emerald-300',
  },
  ATTENDANCE: {
    icon: Calendar,
    label: 'Attendance',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50',
    darkBgColor: 'dark:bg-teal-900/30',
    borderColor: 'border-teal-200',
    darkBorderColor: 'dark:border-teal-800',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    avatarBg: 'bg-teal-100 dark:bg-teal-900/40',
    avatarText: 'text-teal-700 dark:text-teal-300',
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
    avatarBg: 'bg-amber-100 dark:bg-amber-900/40',
    avatarText: 'text-amber-700 dark:text-amber-300',
  },
  NOTICE: {
    icon: Megaphone,
    label: 'Notices',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50',
    darkBgColor: 'dark:bg-sky-900/30',
    borderColor: 'border-sky-200',
    darkBorderColor: 'dark:border-sky-800',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    avatarBg: 'bg-sky-100 dark:bg-sky-900/40',
    avatarText: 'text-sky-700 dark:text-sky-300',
  },
}

const filterOptions = [
  { value: 'ALL', label: 'All Activity' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'EXAM', label: 'Exams' },
  { value: 'NOTICE', label: 'Notices' },
]

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})

  const fetchActivities = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page
    setLoading(resetPage)
    try {
      const res = await activityApi.list({
        type: activeFilter !== 'ALL' ? activeFilter : undefined,
        page: currentPage,
        limit: 20,
      })
      if (res.success && res.data) {
        if (resetPage) {
          setActivities(res.data.items || [])
        } else {
          setActivities((prev) => [...prev, ...(res.data.items || [])])
        }
        setTotal(res.data.total)
        setHasMore(currentPage < (res.data.totalPages || 1))
        setTypeCounts(res.data.typeCounts || {})
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page])

  useEffect(() => {
    setPage(1)
    fetchActivities(true)
  }, [activeFilter])

  const handleLoadMore = () => {
    setPage((prev) => prev + 1)
  }

  useEffect(() => {
    if (page > 1) {
      fetchActivities(false)
    }
  }, [page, fetchActivities])

  const handleRefresh = () => {
    setPage(1)
    fetchActivities(true)
  }

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
              {loading ? 'Loading...' : `${total} activities`}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter.value
          const count = filter.value === 'ALL'
            ? total
            : typeCounts[filter.value] || 0
          const config = typeConfig[filter.value]

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
              {config && <config.icon className="w-3.5 h-3.5" />}
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
      {loading && activities.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
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
                  ? `No ${typeConfig[activeFilter]?.label?.toLowerCase() || ''} activity recorded`
                  : 'No activity recorded yet. Activity will appear as transactions, attendance, and marks are entered.'}
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
            className="relative"
          >
            {/* Timeline line */}
            <div className="absolute left-[21px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700 dark:to-transparent" />

            <div className="space-y-3">
              {activities.map((item, index) => {
                const config = typeConfig[item.type] || typeConfig.PAYMENT
                const Icon = config.icon

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
                  >
                    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md group">
                      <div className="flex items-start gap-3 p-4">
                        {/* Timeline Dot */}
                        <div className="relative flex-shrink-0">
                          {/* Avatar with initials */}
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-900 z-10',
                            config.avatarBg,
                            config.avatarText,
                          )}>
                            {item.initials}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {item.title}
                              </h4>
                              <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 flex-shrink-0', config.badgeColor)}>
                                {item.type}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.relativeTime}
                            </span>
                          </div>

                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>

                          {/* User info */}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                            <UserCircle className="w-3 h-3" />
                            {item.user}
                          </p>

                          {/* Extra details */}
                          <div className="flex items-center gap-2 mt-2">
                            {item.type === 'PAYMENT' && item.amount && (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                KES {item.amount.toLocaleString()}
                                {item.method && ` · ${item.method}`}
                              </Badge>
                            )}
                            {item.type === 'EXAM' && item.marks !== undefined && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                {item.marks}/100 {item.subject && `· ${item.subject}`}
                              </Badge>
                            )}
                            {item.type === 'ATTENDANCE' && item.status && (
                              <Badge variant="outline" className={cn(
                                'text-[10px]',
                                item.status === 'PRESENT' && 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
                                item.status === 'ABSENT' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
                                item.status === 'LATE' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                                item.status === 'EXCUSED' && 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
                              )}>
                                {item.status}
                              </Badge>
                            )}
                            {item.type === 'NOTICE' && item.category && (
                              <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Type icon */}
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity',
                          config.bgColor,
                          config.darkBgColor,
                        )}>
                          <Icon className={cn('w-4 h-4', config.color)} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load More Activities
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && activities.length > 0 && (
              <div className="flex items-center justify-center mt-6">
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                  <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                  Showing all {activities.length} activities
                  <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
