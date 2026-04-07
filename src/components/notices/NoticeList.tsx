'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Bell, Plus, Calendar, Tag, ChevronDown, ChevronUp, Eye, EyeOff, Megaphone, Users, GraduationCap, UserCheck, ShieldCheck, Pin, BookOpen, AlertTriangle, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { noticesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Notice {
  id: string
  title: string
  content: string
  category: string
  targetRoles: string
  isPublished: boolean
  isRead?: boolean
  isPinned?: boolean
  publishedAt?: string
  expiresAt?: string
  createdAt: string
}

export function NoticeList() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [readNotices, setReadNotices] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadNotices()
  }, [])

  const loadNotices = async () => {
    setLoading(true)
    try {
      const res = await noticesApi.list()
      if (res.success && res.data) {
        setNotices(res.data || [])
      } else {
        setNotices([
          {
            id: '1',
            title: 'Term 1 Exam Schedule Released',
            content: 'The Term 1 examination schedule has been finalized. Exams will commence on April 1st, 2025 and run through April 10th. All students are expected to arrive by 7:30 AM on exam days. The detailed timetable is available at the school office and has been shared with class teachers.\n\nParents are requested to ensure their children have all necessary materials including mathematical sets, rulers, and writing materials.',
            category: 'ACADEMIC',
            targetRoles: 'ALL',
            isPublished: true,
            isRead: false,
            isPinned: true,
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'School Holiday Dates',
            content: 'The school will close for the April holiday on April 11th, 2025. Students should be picked up by 12:00 noon. School resumes on May 5th, 2025. All fee balances should be cleared before the closing day.',
            category: 'EVENT',
            targetRoles: 'ALL',
            isPublished: true,
            isRead: false,
            isPinned: true,
            publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: '3',
            title: 'Fee Payment Reminder',
            content: 'This is a reminder that all outstanding fee balances for Term 1 must be cleared by March 31st, 2025. Students with outstanding balances may not be allowed to sit for end-of-term examinations. Payment can be made via M-Pesa (Paybill: 123456), bank transfer, or at the school office.',
            category: 'URGENT',
            targetRoles: 'PARENT',
            isPublished: true,
            isRead: true,
            publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
          {
            id: '4',
            title: 'Sports Day Announcement',
            content: 'The annual school sports day will be held on March 25th, 2025 at the school playground. All parents are welcome to attend. Events include track and field, relay races, and inter-house competitions. Students should come in their house colors.',
            category: 'EVENT',
            targetRoles: 'ALL',
            isPublished: true,
            isRead: true,
            publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
          {
            id: '5',
            title: 'New Library Books Available',
            content: 'The school library has received new books across all subjects. Students are encouraged to visit the library and borrow books for reading. The library is open Monday to Friday from 8:00 AM to 4:00 PM.',
            category: 'GENERAL',
            targetRoles: 'ALL',
            isPublished: true,
            isRead: true,
            publishedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          },
        ])
      }
    } catch {
      setNotices([])
    } finally {
      setLoading(false)
    }
  }

  const categoryColors: Record<string, string> = {
    GENERAL: 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    ACADEMIC: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    EVENT: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    URGENT: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  const categoryBorderColors: Record<string, string> = {
    GENERAL: 'border-l-teal-500',
    ACADEMIC: 'border-l-amber-500',
    EVENT: 'border-l-sky-500',
    URGENT: 'border-l-red-500',
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    GENERAL: <Megaphone className="w-3 h-3" />,
    ACADEMIC: <BookOpen className="w-3 h-3" />,
    EVENT: <Trophy className="w-3 h-3" />,
    URGENT: <AlertTriangle className="w-3 h-3" />,
  }

  const audienceConfig: Record<string, { label: string; icon: typeof Users; className: string }> = {
    ALL: { label: 'Everyone', icon: Users, className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    PARENT: { label: 'Parents', icon: UserCheck, className: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    TEACHER: { label: 'Teachers', icon: GraduationCap, className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    ADMIN: { label: 'Staff', icon: ShieldCheck, className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24 && diffDays === 0) return `${diffHours}h ago`
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return format(date, 'MMM d')
  }

  const toggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setReadNotices((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isRead = (notice: Notice) => readNotices.has(notice.id) || notice.isRead === true

  const unreadCount = notices.filter((n) => !isRead(n)).length

  // Separate pinned and regular notices
  const pinnedNotices = notices.filter((n) => n.isPinned || n.category === 'URGENT')
  const regularNotices = notices.filter((n) => !n.isPinned && n.category !== 'URGENT')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Notices
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs font-semibold">
                {notices.length}
              </Badge>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200">
          <Plus className="w-4 h-4 mr-2" /> Add Notice
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 rounded-2xl">
            <CardContent className="py-16 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
              >
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
              </motion.div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No notices published yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first notice to keep everyone informed</p>
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create First Notice
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Pinned / Urgent Section */}
          {pinnedNotices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pinned & Urgent</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">({pinnedNotices.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedNotices.map((notice, index) => {
                  const read = isRead(notice)
                  const audience = audienceConfig[notice.targetRoles] || audienceConfig.ALL
                  const AudienceIcon = audience.icon
                  return (
                    <motion.div
                      key={notice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className={cn(
                          'shadow-sm border hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 border-l-4 rounded-2xl',
                          categoryBorderColors[notice.category] || 'border-l-slate-300',
                          !read && 'ring-1 ring-teal-500/20',
                          notice.category === 'URGENT' && 'border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-red-50/30 to-white dark:from-red-900/10 dark:to-slate-800',
                        )}
                        onClick={() => {
                          setExpandedId(expandedId === notice.id ? null : notice.id)
                          if (!read) {
                            setReadNotices((prev) => new Set(prev).add(notice.id))
                          }
                        }}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="secondary" className={cn('text-[10px] font-medium gap-1', categoryColors[notice.category] || '')}>
                                  {categoryIcons[notice.category]} {notice.category}
                                </Badge>
                                <Badge variant="secondary" className="bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-medium gap-1">
                                  <Pin className="w-2.5 h-2.5" />
                                  Pinned
                                </Badge>
                                <Badge variant="secondary" className={cn('text-[10px] font-medium gap-1', audience.className)}>
                                  <AudienceIcon className="w-3 h-3" />
                                  {audience.label}
                                </Badge>
                                {!read && (
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                  </span>
                                )}
                                {notice.category === 'URGENT' && (
                                  <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse font-medium">
                                    URGENT
                                  </Badge>
                                )}
                              </div>
                              <h3 className={cn(
                                'text-sm leading-snug',
                                !read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'
                              )}>
                                {notice.title}
                              </h3>
                              <p className={cn(
                                'text-sm text-slate-500 dark:text-slate-400 mt-1',
                                expandedId === notice.id ? '' : 'line-clamp-2'
                              )}>
                                {notice.content}
                              </p>
                              <AnimatePresence>
                                {expandedId === notice.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap"
                                  >
                                    {notice.content}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                  <Calendar className="w-3 h-3" />
                                  <span title={notice.publishedAt
                                    ? format(new Date(notice.publishedAt), 'MMM d, yyyy "at" h:mm a')
                                    : format(new Date(notice.createdAt), 'MMM d, yyyy "at" h:mm a')}>
                                    {formatRelativeDate(notice.publishedAt || notice.createdAt)}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => toggleRead(notice.id, e)}
                                  className={cn(
                                    'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
                                    read
                                      ? 'text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                                      : 'text-teal-600 hover:text-slate-500 hover:bg-slate-50 dark:text-teal-400 dark:hover:bg-slate-700/50'
                                  )}
                                  title={read ? 'Mark as unread' : 'Mark as read'}
                                >
                                  {read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  {read ? 'Read' : 'Unread'}
                                </button>
                              </div>
                            </div>
                            {expandedId === notice.id ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Regular Notices */}
          {regularNotices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">({regularNotices.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularNotices.map((notice, index) => {
                  const read = isRead(notice)
                  const audience = audienceConfig[notice.targetRoles] || audienceConfig.ALL
                  const AudienceIcon = audience.icon
                  return (
                    <motion.div
                      key={notice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <Card
                        className={cn(
                          'shadow-sm border-slate-200/60 dark:border-slate-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800 border-l-4 rounded-2xl',
                          categoryBorderColors[notice.category] || 'border-l-slate-300',
                          !read && 'ring-1 ring-teal-500/20',
                        )}
                        onClick={() => {
                          setExpandedId(expandedId === notice.id ? null : notice.id)
                          if (!read) {
                            setReadNotices((prev) => new Set(prev).add(notice.id))
                          }
                        }}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="secondary" className={cn('text-[10px] font-medium gap-1', categoryColors[notice.category] || '')}>
                                  {categoryIcons[notice.category]} {notice.category}
                                </Badge>
                                <Badge variant="secondary" className={cn('text-[10px] font-medium gap-1', audience.className)}>
                                  <AudienceIcon className="w-3 h-3" />
                                  {audience.label}
                                </Badge>
                                {!read && (
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                                  </span>
                                )}
                              </div>
                              <h3 className={cn(
                                'text-sm leading-snug',
                                !read ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'
                              )}>
                                {notice.title}
                              </h3>
                              <p className={cn(
                                'text-sm text-slate-500 dark:text-slate-400 mt-1',
                                expandedId === notice.id ? '' : 'line-clamp-2'
                              )}>
                                {notice.content}
                              </p>
                              <AnimatePresence>
                                {expandedId === notice.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap"
                                  >
                                    {notice.content}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                                  <Calendar className="w-3 h-3" />
                                  <span title={notice.publishedAt
                                    ? format(new Date(notice.publishedAt), 'MMM d, yyyy "at" h:mm a')
                                    : format(new Date(notice.createdAt), 'MMM d, yyyy "at" h:mm a')}>
                                    {formatRelativeDate(notice.publishedAt || notice.createdAt)}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => toggleRead(notice.id, e)}
                                  className={cn(
                                    'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors',
                                    read
                                      ? 'text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                                      : 'text-teal-600 hover:text-slate-500 hover:bg-slate-50 dark:text-teal-400 dark:hover:bg-slate-700/50'
                                  )}
                                  title={read ? 'Mark as unread' : 'Mark as read'}
                                >
                                  {read ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  {read ? 'Read' : 'Unread'}
                                </button>
                              </div>
                            </div>
                            {expandedId === notice.id ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
