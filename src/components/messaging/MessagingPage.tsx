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
  User,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ---- Types ----

interface MessageItem {
  id: string
  senderId: string
  receiverId: string
  subject: string
  content: string
  isRead: boolean
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

  // Compose form state
  const [composeRecipient, setComposeRecipient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeContent, setComposeContent] = useState('')
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

  const handleSelectMessage = (msg: MessageItem) => {
    setSelectedMessage(msg)
    if (!msg.isRead) {
      handleMarkRead([msg.id])
    }
  }

  const handleSend = async () => {
    if (!user?.id || !composeRecipient || !composeSubject || !composeContent) {
      toast.error('Please fill all fields')
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

  const currentMessages = activeTab === 'inbox' ? messages : sentMessages
  const filteredMessages = searchQuery
    ? currentMessages.filter(
        (m) =>
          m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (activeTab === 'inbox' ? m.sender.name : m.receiver.name).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentMessages

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      case 'ADMIN': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
      case 'TEACHER': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
      case 'PARENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1">
            <Skeleton className="h-96 rounded-lg" />
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

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardHeader className="pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setSelectedMessage(null); setReplyOpen(false) }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {selectedMessage.subject}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-[10px] font-semibold">
                        {otherPerson.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{otherPerson.name}</span>
                    <Badge variant="secondary" className={cn('text-[9px]', getRoleBadgeColor(otherPerson.role))}>
                      {otherPerson.role}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedMessage.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
              </div>
              {!replyOpen && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-800"
                  onClick={() => setReplyOpen(true)}
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Original message */}
            <div className="mb-6">
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
            </div>

            {/* Reply form */}
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
                      className="min-h-[100px] resize-none bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setReplyOpen(false); setReplyContent('') }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Messages</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadMessages}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">To</Label>
                  <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select recipient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <span>{u.name}</span>
                            <Badge variant="secondary" className={cn('text-[9px] ml-1', getRoleBadgeColor(u.role))}>
                              {u.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subject</Label>
                  <Input
                    placeholder="Message subject..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Message</Label>
                  <Textarea
                    placeholder="Write your message..."
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    className="min-h-[120px] resize-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={handleSend}
                    disabled={sending || !composeRecipient || !composeSubject || !composeContent}
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
            activeTab === 'inbox'
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Inbox className="w-4 h-4" />
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 rounded-full text-[10px] font-bold text-white px-1">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'sent'
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Send className="w-4 h-4" />
          Sent
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message List */}
      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardContent className="p-0">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No messages match your search' : activeTab === 'inbox' ? 'No messages in your inbox' : 'No sent messages'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery ? 'Try a different search term' : 'Messages you send and receive will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[500px] overflow-y-auto">
              {filteredMessages.map((msg, idx) => {
                const otherPerson = activeTab === 'inbox' ? msg.sender : msg.receiver
                const isUnread = activeTab === 'inbox' && !msg.isRead
                return (
                  <motion.button
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    onClick={() => handleSelectMessage(msg)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors',
                      isUnread && 'bg-teal-50/50 dark:bg-teal-900/10'
                    )}
                  >
                    <Avatar className={cn('h-10 w-10 mt-0.5 flex-shrink-0', isUnread ? 'ring-2 ring-teal-300 dark:ring-teal-600' : 'ring-1 ring-slate-200 dark:ring-slate-700')}>
                      <AvatarFallback className={cn(
                        'text-xs font-semibold',
                        isUnread
                          ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      )}>
                        {otherPerson.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            'text-sm truncate',
                            isUnread
                              ? 'font-semibold text-slate-900 dark:text-slate-100'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          )}>
                            {otherPerson.name}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm truncate mt-0.5',
                        isUnread
                          ? 'font-medium text-slate-800 dark:text-slate-200'
                          : 'text-slate-600 dark:text-slate-400'
                      )}>
                        {msg.subject}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {msg.content}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-3 flex-shrink-0" />
                  </motion.button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
