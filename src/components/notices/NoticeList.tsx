'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Bell, Plus, Calendar, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
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
  publishedAt?: string
  expiresAt?: string
  createdAt: string
}

export function NoticeList() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
            publishedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'School Holiday Dates',
            content: 'The school will close for the April holiday on April 11th, 2025. Students should be picked up by 12:00 noon. School resumes on May 5th, 2025. All fee balances should be cleared before the closing day.',
            category: 'EVENTS',
            targetRoles: 'ALL',
            isPublished: true,
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
            publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          },
          {
            id: '4',
            title: 'Sports Day Announcement',
            content: 'The annual school sports day will be held on March 25th, 2025 at the school playground. All parents are welcome to attend. Events include track and field, relay races, and inter-house competitions. Students should come in their house colors.',
            category: 'EVENTS',
            targetRoles: 'ALL',
            isPublished: true,
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
    GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    ACADEMIC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    EVENTS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  const categoryIcons: Record<string, string> = {
    GENERAL: '📋',
    ACADEMIC: '📚',
    EVENTS: '🏆',
    URGENT: '⚠️',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{notices.length} notices</p>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white">
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
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No notices published yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create your first notice to keep everyone informed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice, index) => (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                className="shadow-sm border-slate-200/60 dark:border-slate-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow cursor-pointer bg-white dark:bg-slate-800"
                onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px]', categoryColors[notice.category] || '')}
                        >
                          {categoryIcons[notice.category]} {notice.category}
                        </Badge>
                        {notice.category === 'URGENT' && (
                          <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse">
                            URGENT
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {notice.title}
                      </h3>
                      <p className={cn(
                        'text-sm text-slate-600 dark:text-slate-400 mt-1',
                        expandedId === notice.id ? '' : 'line-clamp-2'
                      )}>
                        {notice.content}
                      </p>
                      {expandedId === notice.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap"
                        >
                          {notice.content}
                        </motion.div>
                      )}
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {notice.publishedAt
                          ? format(new Date(notice.publishedAt), 'MMM d, yyyy')
                          : format(new Date(notice.createdAt), 'MMM d, yyyy')}
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
          ))}
        </div>
      )}
    </div>
  )
}
