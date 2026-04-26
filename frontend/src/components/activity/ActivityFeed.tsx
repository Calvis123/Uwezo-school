'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
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
  initials: string
  amount?: number
  method?: string
  status?: string
  className?: string
  marks?: number
  subject?: string
  category?: string
}

const typeConfig: Record<string, {
  icon: React.ElementType
  label: string
  color: string
  header: string
  badgeColor: string
  avatarBg: string
  avatarText: string
}> = {
  PAYMENT: {
    icon: DollarSign,
    label: 'Payments',
    color: 'text-emerald-600 dark:text-emerald-400',
    header: 'from-emerald-200 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/10',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    avatarBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    avatarText: 'text-emerald-700 dark:text-emerald-300',
  },
  ATTENDANCE: {
    icon: Calendar,
    label: 'Attendance',
    color: 'text-teal-600 dark:text-teal-400',
    header: 'from-teal-200 to-teal-50 dark:from-teal-900/40 dark:to-teal-900/10',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    avatarBg: 'bg-teal-100 dark:bg-teal-900/40',
    avatarText: 'text-teal-700 dark:text-teal-300',
  },
  EXAM: {
    icon: FileText,
    label: 'Exams',
    color: 'text-amber-600 dark:text-amber-400',
    header: 'from-amber-200 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/10',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    avatarBg: 'bg-amber-100 dark:bg-amber-900/40',
    avatarText: 'text-amber-700 dark:text-amber-300',
  },
  NOTICE: {
    icon: Megaphone,
    label: 'Notices',
    color: 'text-sky-600 dark:text-sky-400',
    header: 'from-sky-200 to-sky-50 dark:from-sky-900/40 dark:to-sky-900/10',
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
  const { user } = useAppStore()
  const isBursar = user?.role === 'BURSAR'
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(isBursar ? 'PAYMENT' : 'ALL')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})

  const visibleFilterOptions = isBursar
    ? filterOptions.filter((filter) => ['ALL', 'PAYMENT', 'NOTICE'].includes(filter.value))
    : filterOptions

  const fetchActivities = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page
    setLoading(resetPage)
    try {
      const effectiveFilter = isBursar && activeFilter === 'ALL' ? 'PAYMENT' : activeFilter
      const res = await activityApi.list({
        type: effectiveFilter !== 'ALL' ? effectiveFilter : undefined,
        page: currentPage,
        limit: 20,
      })
      if (res.success && res.data) {
        if (resetPage) {
          setActivities(res.data.items || [])
        } else {
          setActivities((prev) => [...prev, ...(res.data.items || [])])
        }
        setTotal(res.data.total || 0)
        setHasMore(currentPage < (res.data.totalPages || 1))
        setTypeCounts(res.data.typeCounts || {})
      }
    } finally {
      setLoading(false)
    }
  }, [activeFilter, page, isBursar])

  useEffect(() => {
    setPage(1)
    fetchActivities(true)
  }, [activeFilter])

  useEffect(() => {
    if (page > 1) fetchActivities(false)
  }, [page, fetchActivities])

  const grouped = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {}
    for (const item of activities) {
      const date = new Date(item.timestamp)
      const today = new Date()
      const yest = new Date(today)
      yest.setDate(today.getDate() - 1)
      const key = date.toDateString() === today.toDateString()
        ? 'Today'
        : date.toDateString() === yest.toDateString()
          ? 'Yesterday'
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [activities])

  const handleRefresh = () => {
    setPage(1)
    fetchActivities(true)
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 to-indigo-500" />
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isBursar ? 'Finance Activity Feed' : 'Activity Feed'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? 'Loading...' : `${total} activities tracked`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleFilterOptions
          .filter((f) => f.value !== 'ALL')
          .map((filter) => {
            const config = typeConfig[filter.value]
            const count = typeCounts[filter.value] || 0
            if (!config) return null
            const Icon = config.icon
            return (
              <Card key={filter.value} className="border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
                <div className={cn('h-1 bg-gradient-to-r', config.header)} />
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.avatarBg)}>
                    <Icon className={cn('w-4 h-4', config.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{config.label}</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{count}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleFilterOptions.map((filter) => {
          const isActive = activeFilter === filter.value
          const count = filter.value === 'ALL' ? total : typeCounts[filter.value] || 0
          const config = typeConfig[filter.value]

          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
              )}
            >
              {config && <config.icon className="w-3.5 h-3.5" />}
              {filter.label}
              <span className={cn(
                'text-[11px] font-medium px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading && activities.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
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
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">No activity found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                {activeFilter !== 'ALL' ? `No ${typeConfig[activeFilter]?.label?.toLowerCase() || ''} activity recorded.` : 'Activity will appear here once new actions are recorded.'}
              </p>
            </div>
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
            {Object.entries(grouped).map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">{groupName}</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {groupItems.map((item, index) => {
                    const config = typeConfig[item.type] || typeConfig.PAYMENT
                    const Icon = config.icon
                    const attendanceStatement = item.type === 'ATTENDANCE' && item.status
                      ? `${item.user} was marked ${item.status.toLowerCase()} in ${item.className || 'class'} on ${new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : null
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.2 }}
                      >
                        <Card className="overflow-hidden border-slate-200/70 dark:border-slate-700/70 hover:shadow-md transition">
                          <div className={cn('h-1.5 bg-gradient-to-r', config.header)} />
                          <div className="flex items-start gap-3 p-4">
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold', config.avatarBg, config.avatarText)}>
                              {item.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {attendanceStatement || item.description}
                                  </p>
                                </div>
                                <Badge className={cn('text-[10px] px-1.5 py-0', config.badgeColor)}>{item.type}</Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                                <span className="inline-flex items-center gap-1"><UserCircle className="w-3 h-3" />{item.user}</span>
                                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{item.relativeTime}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {item.type === 'PAYMENT' && item.amount && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                                    KES {item.amount.toLocaleString()}{item.method ? ` · ${item.method}` : ''}
                                  </Badge>
                                )}
                                {item.type === 'EXAM' && item.marks !== undefined && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                                    {item.marks}/100 {item.subject ? `· ${item.subject}` : ''}
                                  </Badge>
                                )}
                                {item.type === 'ATTENDANCE' && item.status && (
                                  <Badge variant="outline" className={cn(
                                    'text-[10px]',
                                    item.status === 'ABSENT'
                                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800'
                                  )}>
                                    {item.status}
                                  </Badge>
                                )}
                                {item.type === 'NOTICE' && item.category && (
                                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800">
                                    {item.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.avatarBg)}>
                              <Icon className={cn('w-4 h-4', config.color)} />
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button variant="outline" onClick={() => setPage((prev) => prev + 1)} disabled={loading}>
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
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
