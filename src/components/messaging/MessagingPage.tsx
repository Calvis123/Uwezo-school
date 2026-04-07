'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  MessageSquare,
  Send,
  Inbox,
  ArrowLeft,
  Reply,
  Plus,
  Mail,
  MailOpen,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronRight,
  X,
  Search,
  CheckCheck,
  PenSquare,
  Star,
  Trash2,
  Archive,
  Tag,
  User,
  Circle,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { messagesApi, usersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

// ---- Types ----

interface MessageItem {
  id: string
  senderId: string
  receiverId: string
  subject: string
  content: string
  priority?: string
  isRead: boolean
  isStarred?: boolean
  createdAt: string
  updatedAt: string
  sender: { id: string; name: string; email: string; role: string }
  receiver: { id: string; name: string; email: string; role: string }
}

interface UserOption {
  id: string
  name: string
  email: string
  role: string
}

type Priority = 'low' | 'normal' | 'high' | 'urgent'

// ---- Helpers ----

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    case 'ADMIN': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
    case 'TEACHER': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
    case 'PARENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }
}

const getAvatarColor = (name: string, isUnread: boolean) => {
  if (isUnread) return 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-300 dark:ring-teal-600'
  const colors = [
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  ]
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[idx] + ' ring-1 ring-slate-200 dark:ring-slate-700'
}

const getPriorityConfig = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgent',
        dot: 'bg-red-500',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
        glow: 'shadow-red-500/20',
      }
    case 'high':
      return {
        label: 'High',
        dot: 'bg-orange-500',
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        glow: 'shadow-orange-500/20',
      }
    case 'low':
      return {
        label: 'Low',
        dot: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600',
        glow: '',
      }
    default:
      return {
        label: 'Normal',
        dot: 'bg-teal-500',
        badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        glow: '',
      }
  }
}

const formatRelative = (dateStr: string) => {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return format(date, 'MMM d, yyyy')
}

// ---- Component ----

export function MessagingPage() {
  const { user } = useAppStore()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [sentMessages, setSentMessages] = useState<MessageItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<MessageItem | null>(null)

  // Compose form state
  const [composeRecipient, setComposeRecipient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeContent, setComposeContent] = useState('')
  const [composePriority, setComposePriority] = useState<string>('normal')
  const [sending, setSending] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadMessages()
      loadUsers()
    }
  }, [user?.id])

  const loadMessages = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [inboxRes, sentRes] = await Promise.all([
        messagesApi.list(user.id, 'inbox'),
        messagesApi.list(user.id, 'sent'),
      ])
      if (inboxRes.success && inboxRes.data) {
        setMessages(inboxRes.data.messages)
        setUnreadCount(inboxRes.data.unreadCount)
      }
      if (sentRes.success && sentRes.data) {
        setSentMessages(sentRes.data.messages)
      }
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await usersApi.list({ limit: 100 })
      if (res.success && res.data) {
        const items = res.data.items || res.data || []
        setUsers(
          items
            .filter((u: any) => u.id !== user?.id && u.status === 'ACTIVE')
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
            }))
        )
      }
    } catch {
      // Silent fail
    }
  }

  const handleMarkRead = async (messageIds: string[]) => {
    if (!user?.id) return
    try {
      await messagesApi.markRead(messageIds)
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m.id) ? { ...m, isRead: true } : m))
      )
      setUnreadCount((prev) => Math.max(0, prev - messageIds.length))
    } catch {
      // Silent fail
    }
  }

  const handleToggleStar = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation()
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStarred: !m.isStarred } : m))
    )
    setSentMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStarred: !m.isStarred } : m))
    )
  }

  const handleSelectMessage = (msg: MessageItem) => {
    setSelectedMessage(msg)
    if (!msg.isRead) {
      handleMarkRead([msg.id])
    }
  }

  const handleSend = async () => {
    if (!user?.id || !composeRecipient || !composeSubject || !composeContent) {
      toast.error('Please fill all required fields')
      return
    }
    setSending(true)
    try {
      const res = await messagesApi.send({
        senderId: user.id,
        receiverId: composeRecipient,
        subject: composeSubject,
        content: composeContent,
      })
      if (res.success) {
        toast.success('Message sent successfully')
        setComposeOpen(false)
        setComposeRecipient('')
        setComposeSubject('')
        setComposeContent('')
        setComposePriority('normal')
        loadMessages()
      } else {
        toast.error(res.error || 'Failed to send message')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleReply = async () => {
    if (!user?.id || !selectedMessage || !replyContent.trim()) {
      toast.error('Please write a reply')
      return
    }
    setSending(true)
    try {
      const recipientId = selectedMessage.senderId === user.id
        ? selectedMessage.receiverId
        : selectedMessage.senderId
      const res = await messagesApi.send({
        senderId: user.id,
        receiverId: recipientId,
        subject: `Re: ${selectedMessage.subject.replace(/^Re:\s*/, '')}`,
        content: replyContent,
      })
      if (res.success) {
        toast.success('Reply sent successfully')
        setReplyOpen(false)
        setReplyContent('')
        loadMessages()
      } else {
        toast.error(res.error || 'Failed to send reply')
      }
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleDeleteMessage = (msg: MessageItem) => {
    setMessageToDelete(msg)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!messageToDelete) return
    if (activeTab === 'inbox') {
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id))
    } else {
      setSentMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id))
    }
    toast.success('Message deleted')
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
    if (selectedMessage?.id === messageToDelete.id) {
      setSelectedMessage(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    const unreadIds = messages.filter((m) => !m.isRead).map((m) => m.id)
    if (unreadIds.length === 0) return
    try {
      await messagesApi.markRead(unreadIds)
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
      setUnreadCount(0)
      toast.success(`Marked ${unreadIds.length} message${unreadIds.length > 1 ? 's' : ''} as read`)
    } catch {
      toast.error('Failed to mark messages as read')
    }
  }

  const currentMessages = activeTab === 'inbox' ? messages : sentMessages
  const filteredMessages = searchQuery
    ? currentMessages.filter(
        (m) =>
          m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (activeTab === 'inbox' ? m.sender.name : m.receiver.name).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentMessages

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
          <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700/60">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-64 rounded" />
                  <Skeleton className="h-3 w-48 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- Message Detail View ----
  if (selectedMessage) {
    const otherPerson = selectedMessage.senderId === user?.id
      ? selectedMessage.receiver
      : selectedMessage.sender
    const priorityConfig = getPriorityConfig(selectedMessage.priority)

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-800/80 dark:to-slate-800">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                onClick={() => { setSelectedMessage(null); setReplyOpen(false) }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedMessage.subject}
                  </h3>
                  {selectedMessage.priority && selectedMessage.priority !== 'normal' && (
                    <Badge variant="outline" className={cn('text-[10px] gap-1 border', priorityConfig.badge)}>
                      <Circle className="w-1.5 h-1.5 fill-current" />
                      {priorityConfig.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className={cn('text-[10px] font-semibold', getAvatarColor(otherPerson.name, false))}>
                      {getInitials(otherPerson.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{otherPerson.name}</span>
                  <Badge variant="secondary" className={cn('text-[9px]', getRoleBadgeColor(otherPerson.role))}>
                    {otherPerson.role.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedMessage.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDeleteMessage(selectedMessage)} className="text-red-600 dark:text-red-400 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {!replyOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800 rounded-lg"
                    onClick={() => setReplyOpen(true)}
                  >
                    <Reply className="w-4 h-4" />
                    Reply
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {/* Body */}
          <CardContent className="pt-6 pb-6">
            <div className="mb-6">
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-5 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
            </div>

            {/* Reply */}
            <AnimatePresence>
              {replyOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Reply className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Reply to {otherPerson.name}
                      </span>
                    </div>
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[100px] resize-none bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 rounded-xl"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => { setReplyOpen(false); setReplyContent('') }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                        onClick={handleReply}
                        disabled={sending || !replyContent.trim()}
                      >
                        {sending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Messages</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {unreadCount > 0 ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block animate-pulse" />
                  <span className="font-medium text-teal-600 dark:text-teal-400">{unreadCount} unread</span>
                  <span>message{unreadCount > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-3 h-3 text-emerald-500" />
                  All caught up
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:border-teal-200 dark:hover:border-teal-800 rounded-lg"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg"
            onClick={loadMessages}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-md shadow-teal-500/20">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Compose</span>
                <PenSquare className="w-3.5 h-3.5 sm:hidden" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl border-slate-200/60 dark:border-slate-700/60">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  New Message
                </DialogTitle>
                <DialogDescription>Send a message to a staff member, teacher, or parent.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    To <span className="text-red-400">*</span>
                  </Label>
                  <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                      <SelectValue placeholder="Select recipient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            <Badge variant="secondary" className={cn('text-[9px] ml-1', getRoleBadgeColor(u.role))}>
                              {u.role.replace('_', ' ')}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Subject <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    placeholder="Message subject..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-slate-400" />
                    Priority
                  </Label>
                  <Select value={composePriority} onValueChange={setComposePriority}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-slate-400 text-slate-400" />
                          Low
                        </span>
                      </SelectItem>
                      <SelectItem value="normal">
                        <span className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-teal-500 text-teal-500" />
                          Normal
                        </span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-orange-500 text-orange-500" />
                          High
                        </span>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <span className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                          Urgent
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    Message <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    placeholder="Write your message..."
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    className="min-h-[120px] resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setComposeOpen(false)} className="rounded-lg">
                    Cancel
                  </Button>
                  <Button
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-md shadow-teal-500/20"
                    onClick={handleSend}
                    disabled={sending || !composeRecipient || !composeSubject || !composeContent}
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Tabs + Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-1 shadow-sm flex-shrink-0">
          <button
            onClick={() => setActiveTab('inbox')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative',
              activeTab === 'inbox'
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/30'
            )}
          >
            <Inbox className="w-4 h-4" />
            Inbox
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white px-1.5 shadow-sm shadow-red-500/30">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'sent'
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/30'
            )}
          >
            <Send className="w-4 h-4" />
            Sent
            {sentMessages.length > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center bg-slate-200 dark:bg-slate-600 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 px-1.5">
                {sentMessages.length}
              </span>
            )}
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Message List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-block mb-5"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700/60 dark:to-slate-700/30 flex items-center justify-center shadow-sm">
                    {searchQuery ? (
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    ) : activeTab === 'inbox' ? (
                      <MailOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    ) : (
                      <Send className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </motion.div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {searchQuery
                    ? 'No messages match your search'
                    : activeTab === 'inbox'
                      ? 'Your inbox is empty'
                      : 'No sent messages'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs text-center">
                  {searchQuery
                    ? 'Try a different search term or clear your filters'
                    : activeTab === 'inbox'
                      ? 'Messages you receive will appear here'
                      : 'Messages you send will appear here'}
                </p>
                {!searchQuery && activeTab === 'inbox' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-5 gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:border-teal-200 dark:hover:border-teal-800 rounded-lg"
                    onClick={() => setComposeOpen(true)}
                  >
                    <PenSquare className="w-4 h-4" />
                    Compose your first message
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[520px]">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredMessages.map((msg, idx) => {
                    const otherPerson = activeTab === 'inbox' ? msg.sender : msg.receiver
                    const isUnread = activeTab === 'inbox' && !msg.isRead
                    const priorityConfig = getPriorityConfig(msg.priority)
                    return (
                      <motion.button
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: idx * 0.02 }}
                        onClick={() => handleSelectMessage(msg)}
                        className={cn(
                          'w-full flex items-start gap-3 p-4 text-left transition-all duration-200 group relative',
                          isUnread
                            ? 'bg-teal-50/40 dark:bg-teal-900/10 hover:bg-teal-50/70 dark:hover:bg-teal-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                        )}
                      >
                        {/* Unread indicator */}
                        {isUnread && (
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal-500 rounded-r-full" />
                        )}

                        {/* Avatar */}
                        <Avatar className={cn('h-10 w-10 mt-0.5 flex-shrink-0', getAvatarColor(otherPerson.name, isUnread))}>
                          <AvatarFallback className={cn(
                            'text-xs font-semibold',
                            getAvatarColor(otherPerson.name, isUnread).split(' ').filter(c => c.startsWith('bg-') || c.startsWith('dark:')).length > 0
                              ? ''
                              : ''
                          )}>
                            {getInitials(otherPerson.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                'text-sm truncate',
                                isUnread
                                  ? 'font-bold text-slate-900 dark:text-slate-100'
                                  : 'font-medium text-slate-700 dark:text-slate-300'
                              )}>
                                {otherPerson.name}
                              </span>
                              {isUnread && (
                                <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 shadow-sm shadow-teal-500/40" />
                              )}
                              {msg.priority && msg.priority !== 'normal' && (
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityConfig.dot)} />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 flex items-center gap-1">
                              {formatRelative(msg.createdAt)}
                            </span>
                          </div>
                          <p className={cn(
                            'text-sm truncate mt-0.5',
                            isUnread
                              ? 'font-semibold text-slate-800 dark:text-slate-200'
                              : 'text-slate-600 dark:text-slate-400'
                          )}>
                            {msg.subject}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-relaxed">
                            {msg.content}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleStar(e, msg.id)}
                            className={cn(
                              'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                              msg.isStarred
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-amber-400'
                            )}
                          >
                            <Star className={cn('w-3.5 h-3.5', msg.isStarred && 'fill-current')} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteMessage(msg)
                            }}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Message count footer */}
      {filteredMessages.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[11px] text-slate-400 dark:text-slate-500"
        >
          Showing {filteredMessages.length} of {currentMessages.length} message{currentMessages.length !== 1 ? 's' : ''}
        </motion.p>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{messageToDelete?.subject}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
