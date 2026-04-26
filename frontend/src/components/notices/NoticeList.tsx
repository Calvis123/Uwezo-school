'use client'

import { useState, useEffect, type MouseEvent } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Bell, Plus, Calendar, Tag, ChevronDown, ChevronUp, Eye, EyeOff, Megaphone, Users, GraduationCap, UserCheck, ShieldCheck, Pin, BookOpen, AlertTriangle, Trophy, Newspaper, CheckCircle2, XCircle, Pencil, Trash2, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { noticesApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  const { user } = useAppStore()
  const isBursar = user?.role === 'BURSAR'
  const canManageNotices = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY'].includes(user?.role || '')
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [readNotices, setReadNotices] = useState<Set<string>>(new Set())
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false)
  const [noticeDeleteOpen, setNoticeDeleteOpen] = useState(false)
  const [noticeToDelete, setNoticeToDelete] = useState<Notice | null>(null)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [savingNotice, setSavingNotice] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [audienceFilter, setAudienceFilter] = useState('ALL')
  const [noticeSearch, setNoticeSearch] = useState('')
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    targetRoles: 'ALL',
    expiresAt: '',
    publishNow: true,
  })

  useEffect(() => {
    loadNotices()
  }, [canManageNotices])

  const loadNotices = async () => {
    setLoading(true)
    try {
      const res = await noticesApi.list({ includeDrafts: canManageNotices })
      if (res.success && res.data) {
        setNotices(res.data || [])
      } else {
        setNotices([])
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

  const statusBadge = (notice: Notice) => {
    if (notice.isPublished) {
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Published
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" />
        Draft
      </span>
    )
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

  const toggleRead = (id: string, e: MouseEvent) => {
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

  const visibleNotices = isBursar
    ? notices.filter((notice) =>
        ['ALL', 'PARENT', 'ADMIN', 'STAFF'].includes(notice.targetRoles) &&
        notice.category !== 'ACADEMIC'
      )
    : notices

  const filteredNotices = visibleNotices.filter((notice) => {
    if (categoryFilter !== 'ALL' && notice.category !== categoryFilter) return false
    if (audienceFilter !== 'ALL' && notice.targetRoles !== audienceFilter) return false
    if (noticeSearch.trim()) {
      const q = noticeSearch.trim().toLowerCase()
      return (
        notice.title.toLowerCase().includes(q) ||
        notice.content.toLowerCase().includes(q)
      )
    }
    return true
  })

  const unreadCount = filteredNotices.filter((n) => !isRead(n)).length

  // Separate pinned and regular notices
  const pinnedNotices = filteredNotices.filter((n) => n.isPinned || n.category === 'URGENT')
  const regularNotices = filteredNotices.filter((n) => !n.isPinned && n.category !== 'URGENT')

  const resetNoticeForm = () => {
    setNoticeForm({
      title: '',
      content: '',
      category: 'GENERAL',
      targetRoles: 'ALL',
      expiresAt: '',
      publishNow: true,
    })
  }

  const handleCreateNotice = () => {
    setEditingNotice(null)
    resetNoticeForm()
    setNoticeDialogOpen(true)
  }

  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice)
    setNoticeForm({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      targetRoles: notice.targetRoles || 'ALL',
      expiresAt: notice.expiresAt ? new Date(notice.expiresAt).toISOString().slice(0, 10) : '',
      publishNow: notice.isPublished,
    })
    setNoticeDialogOpen(true)
  }

  const handleSaveNotice = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setSavingNotice(true)
    try {
      const payload = {
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
        category: noticeForm.category,
        targetRoles: noticeForm.targetRoles,
        expiresAt: noticeForm.expiresAt || null,
        isPublished: noticeForm.publishNow,
      }
      const res = editingNotice
        ? await noticesApi.update(editingNotice.id, payload)
        : await noticesApi.create(payload)

      if (!res.success) {
        toast.error(res.error || 'Failed to save notice')
        return
      }

      toast.success(editingNotice ? 'Notice updated' : 'Notice created')
      setNoticeDialogOpen(false)
      setEditingNotice(null)
      resetNoticeForm()
      loadNotices()
    } catch {
      toast.error('Failed to save notice')
    } finally {
      setSavingNotice(false)
    }
  }

  const handleTogglePublish = async (notice: Notice) => {
    try {
      const res = await noticesApi.update(notice.id, { isPublished: !notice.isPublished })
      if (!res.success) {
        toast.error(res.error || 'Failed to update publish status')
        return
      }
      toast.success(notice.isPublished ? 'Notice moved to draft' : 'Notice published')
      loadNotices()
    } catch {
      toast.error('Failed to update publish status')
    }
  }

  const handleRequestDeleteNotice = (notice: Notice) => {
    setNoticeToDelete(notice)
    setNoticeDeleteOpen(true)
  }

  const handleConfirmDeleteNotice = async () => {
    if (!noticeToDelete) return
    try {
      const res = await noticesApi.delete(noticeToDelete.id)
      if (!res.success) {
        toast.error(res.error || 'Failed to delete notice')
        return
      }
      toast.success('Notice deleted')
      setNoticeDeleteOpen(false)
      setNoticeToDelete(null)
      loadNotices()
    } catch {
      toast.error('Failed to delete notice')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isBursar ? 'Fee Notices' : 'Notices'}
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs font-semibold">
                {filteredNotices.length}
              </Badge>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {canManageNotices && (
          <Button
            onClick={handleCreateNotice}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" /> {isBursar ? 'Add Fee Notice' : 'Add Notice'}
          </Button>
        )}
      </div>

      {isBursar && (
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            This view prioritizes billing reminders, payment deadlines, and finance-related announcements.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
            <SelectItem value="ACADEMIC">Academic</SelectItem>
            <SelectItem value="EVENT">Event</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Audiences</SelectItem>
            <SelectItem value="PARENT">Parents</SelectItem>
            <SelectItem value="TEACHER">Teachers</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
            <SelectItem value="DOS">DOS</SelectItem>
            <SelectItem value="HEADTEACHER">Headteacher</SelectItem>
            <SelectItem value="SECRETARY">Secretary</SelectItem>
            <SelectItem value="BURSAR">Bursar</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={noticeSearch}
          onChange={(e) => setNoticeSearch(e.target.value)}
          placeholder="Search notices by title or content..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
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
                  <Newspaper className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
              </motion.div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No notices published yet</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first notice to keep everyone informed</p>
              {canManageNotices && (
                <Button onClick={handleCreateNotice} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Create First Notice
                </Button>
              )}
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
                                {statusBadge(notice)}
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
                                {canManageNotices && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditNotice(notice) }}
                                      className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                      title="Edit notice"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleTogglePublish(notice) }}
                                      className={cn(
                                        'h-6 w-6 rounded-md flex items-center justify-center',
                                        notice.isPublished
                                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                      )}
                                      title={notice.isPublished ? 'Move to draft' : 'Publish notice'}
                                    >
                                      <SendHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRequestDeleteNotice(notice) }}
                                      className="h-6 w-6 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      title="Delete notice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
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
                                expandedId === notice.id ? '' : 'line-clamp-3'
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
                                {statusBadge(notice)}
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
                                {canManageNotices && (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditNotice(notice) }}
                                      className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                      title="Edit notice"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleTogglePublish(notice) }}
                                      className={cn(
                                        'h-6 w-6 rounded-md flex items-center justify-center',
                                        notice.isPublished
                                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                      )}
                                      title={notice.isPublished ? 'Move to draft' : 'Publish notice'}
                                    >
                                      <SendHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRequestDeleteNotice(notice) }}
                                      className="h-6 w-6 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      title="Delete notice"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
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
                                expandedId === notice.id ? '' : 'line-clamp-3'
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

      <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNotice ? 'Edit Notice' : 'Create Notice'}</DialogTitle>
            <DialogDescription>
              Create and publish notices to the right audience across the school.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={noticeForm.title}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Notice title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={noticeForm.content}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write notice details..."
                className="min-h-[160px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={noticeForm.category}
                  onValueChange={(v) => setNoticeForm((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="ACADEMIC">Academic</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={noticeForm.targetRoles}
                  onValueChange={(v) => setNoticeForm((prev) => ({ ...prev, targetRoles: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Everyone</SelectItem>
                    <SelectItem value="PARENT">Parents</SelectItem>
                    <SelectItem value="TEACHER">Teachers</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="DOS">DOS</SelectItem>
                    <SelectItem value="HEADTEACHER">Headteacher</SelectItem>
                    <SelectItem value="SECRETARY">Secretary</SelectItem>
                    <SelectItem value="BURSAR">Bursar</SelectItem>
                    <SelectItem value="ADMIN">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={noticeForm.expiresAt}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <button
                type="button"
                className={cn(
                  'text-sm px-3 py-1.5 rounded-md border',
                  noticeForm.publishNow
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-slate-200 text-slate-600 bg-slate-50'
                )}
                onClick={() => setNoticeForm((prev) => ({ ...prev, publishNow: !prev.publishNow }))}
              >
                {noticeForm.publishNow ? 'Publish now' : 'Save as draft'}
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setNoticeDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveNotice} disabled={savingNotice}>
                  {savingNotice ? 'Saving...' : editingNotice ? 'Update Notice' : 'Create Notice'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={noticeDeleteOpen} onOpenChange={setNoticeDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noticeToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDeleteNotice}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
