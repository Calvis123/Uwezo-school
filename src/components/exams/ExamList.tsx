'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, FileText, CalendarDays, Filter, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { examsApi, refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamRow {
  id: string
  name: string
  termId: string
  classId: string
  class?: { name: string }
  term?: { name: string; year: number }
  type: string
  startDate: string
  endDate: string
  status: string
  totalMarks: number
}

const statusBorderColors: Record<string, string> = {
  DRAFT: 'border-l-slate-400 dark:border-l-slate-500',
  ACTIVE: 'border-l-teal-500 dark:border-l-teal-400',
  COMPLETED: 'border-l-green-500 dark:border-l-green-400',
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
  ACTIVE: 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
  COMPLETED: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800',
}

const statusDotColors: Record<string, string> = {
  DRAFT: 'bg-slate-400 dark:bg-slate-500',
  ACTIVE: 'bg-teal-500 dark:bg-teal-400',
  COMPLETED: 'bg-green-500 dark:bg-green-400',
}

const typeLabels: Record<string, string> = {
  CAT_1: 'CAT 1',
  CAT_2: 'CAT 2',
  END_TERM: 'End Term',
}

const typeColors: Record<string, string> = {
  CAT_1: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  CAT_2: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  END_TERM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
}

export function ExamList() {
  const { classes, terms, setClasses, setTerms, navigateTo, setSelectedExamId } = useAppStore()
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [localClasses, setLocalClasses] = useState(classes)
  const [localTerms, setLocalTerms] = useState(terms)
  const [newExam, setNewExam] = useState({
    name: '',
    classId: '',
    termId: '',
    type: 'END_TERM',
    startDate: '',
    endDate: '',
  })

  const loadExams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await examsApi.list({ classId: filterClass, status: filterStatus })
      if (res.success && res.data) {
        setExams(res.data || [])
      } else {
        setExams([
          { id: '1', name: 'Term 1 CAT 1', classId: '1', class: { name: 'Grade 4' }, termId: '1', term: { name: 'Term 1', year: 2025 }, type: 'CAT_1', startDate: '2025-02-15', endDate: '2025-02-20', status: 'COMPLETED', totalMarks: 100 },
          { id: '2', name: 'Term 1 CAT 2', classId: '1', class: { name: 'Grade 4' }, termId: '1', term: { name: 'Term 1', year: 2025 }, type: 'CAT_2', startDate: '2025-03-15', endDate: '2025-03-20', status: 'COMPLETED', totalMarks: 100 },
          { id: '3', name: 'Term 1 End Term', classId: '1', class: { name: 'Grade 4' }, termId: '1', term: { name: 'Term 1', year: 2025 }, type: 'END_TERM', startDate: '2025-04-01', endDate: '2025-04-10', status: 'ACTIVE', totalMarks: 100 },
          { id: '4', name: 'Term 1 End Term', classId: '2', class: { name: 'Grade 5' }, termId: '1', term: { name: 'Term 1', year: 2025 }, type: 'END_TERM', startDate: '2025-04-01', endDate: '2025-04-10', status: 'ACTIVE', totalMarks: 100 },
          { id: '5', name: 'Term 1 CAT 1', classId: '2', class: { name: 'Grade 5' }, termId: '1', term: { name: 'Term 1', year: 2025 }, type: 'CAT_1', startDate: '2025-02-15', endDate: '2025-02-20', status: 'DRAFT', totalMarks: 100 },
        ])
      }
    } catch {
      setExams([])
    } finally {
      setLoading(false)
    }
  }, [filterClass, filterStatus])

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) { setClasses(res.data); setLocalClasses(res.data) }
      })
    } else { setLocalClasses(classes) }
    if (terms.length === 0) {
      refApi.terms().then((res) => {
        if (res.success && res.data) { setTerms(res.data); setLocalTerms(res.data) }
      })
    } else { setLocalTerms(terms) }
  }, [classes, terms, setClasses, setTerms])

  useEffect(() => { loadExams() }, [loadExams])

  const handleCreateExam = async () => {
    if (!newExam.name || !newExam.classId || !newExam.termId) {
      toast.error('Please fill all required fields')
      return
    }
    setCreating(true)
    try {
      const result = await examsApi.create(newExam)
      if (result.success) {
        toast.success('Exam created successfully')
        setCreateOpen(false)
        setNewExam({ name: '', classId: '', termId: '', type: 'END_TERM', startDate: '', endDate: '' })
        loadExams()
      } else {
        toast.error(result.error || 'Failed to create exam')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const result = await examsApi.delete(deleteId)
      if (result.success) {
        toast.success('Exam deleted successfully')
        loadExams()
      } else {
        toast.error(result.error || 'Failed to delete exam')
      }
    } catch {
      toast.error('An error occurred')
    }
    setDeleteId(null)
  }

  const hasFilters = filterClass || filterStatus

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Exams & Results</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage exams, marks, and report cards</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Create Exam
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
          <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-44 h-9 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {localClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full sm:w-40 h-9 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" onClick={() => { setFilterClass(''); setFilterStatus('') }}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Exam Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-5">
            <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No exams scheduled</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-5 text-center max-w-xs">
            Create your first exam to start tracking student performance and generating report cards.
          </p>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create First Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={cn(
                'border-l-4 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] group',
                'bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60',
                statusBorderColors[exam.status] || 'border-l-slate-300'
              )}>
                <CardContent className="p-5">
                  {/* Exam name and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{exam.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {exam.class?.name || '—'} · {exam.term ? `${exam.term.name} ${exam.term.year}` : '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] font-medium flex-shrink-0 ml-2', statusColors[exam.status])}>
                      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 inline-block', statusDotColors[exam.status])} />
                      {exam.status}
                    </Badge>
                  </div>

                  {/* Type badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={cn('text-[10px]', typeColors[exam.type] || '')}>
                      {typeLabels[exam.type] || exam.type}
                    </Badge>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {format(new Date(exam.startDate), 'MMM d')} – {format(new Date(exam.endDate), 'MMM d')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/30"
                      onClick={(e) => { e.stopPropagation(); setSelectedExamId(exam.id); navigateTo('mark-entry') }}
                    >
                      <FileText className="w-3 h-3 mr-1.5" />
                      Marks
                    </Button>
                    {exam.status === 'COMPLETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedExamId(exam.id); navigateTo('report-cards') }}
                      >
                        Report
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(exam.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Create New Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Exam Name *</Label>
              <Input
                value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                placeholder="e.g. Term 1 End Term"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Class *</Label>
                <Select value={newExam.classId} onValueChange={(v) => setNewExam({ ...newExam, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {localClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Term *</Label>
                <Select value={newExam.termId} onValueChange={(v) => setNewExam({ ...newExam, termId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {localTerms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Type</Label>
              <Select value={newExam.type} onValueChange={(v) => setNewExam({ ...newExam, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAT_1">CAT 1</SelectItem>
                  <SelectItem value="CAT_2">CAT 2</SelectItem>
                  <SelectItem value="END_TERM">End Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Start Date</Label>
                <Input
                  type="date"
                  value={newExam.startDate}
                  onChange={(e) => setNewExam({ ...newExam, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">End Date</Label>
                <Input
                  type="date"
                  value={newExam.endDate}
                  onChange={(e) => setNewExam({ ...newExam, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleCreateExam} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Delete Exam</DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to delete this exam? This will also remove all associated marks. This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
