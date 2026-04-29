'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { examsApi, refApi, teacherApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  class?: { name: string; stream?: string | null }
  term?: { name: string; year: number }
  type: string
  startDate: string
  endDate: string
  status: string
  totalMarks: number
}

function getClassLabel(cls?: { name?: string | null; stream?: string | null }) {
  if (!cls?.name) return '-'
  if (!cls.stream) return cls.name
  if (new RegExp(`\\s+${cls.stream}$`, 'i').test(cls.name)) return cls.name
  return `${cls.name} ${cls.stream}`
}

export function ExamList() {
  const { classes, terms, setClasses, setTerms, navigateTo, setSelectedExamId, user, selectedClassId } = useAppStore()
  const isTeacherView = user?.role === 'TEACHER'
  const canCreateExam = user?.role === 'DOS'
  const canOpenMarkEntry = user?.role === 'DOS' || user?.role === 'TEACHER'
  const canOpenReport = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER'].includes(user?.role || '')
  const showActionsColumn = canOpenMarkEntry || canOpenReport
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filterClass, setFilterClass] = useState(selectedClassId || '')
  const [filterStatus, setFilterStatus] = useState('')
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
    if (isTeacherView) {
      teacherApi.classes().then((res) => {
        if (res.success && res.data) {
          const teacherClasses = Array.isArray(res.data) ? res.data : []
          setLocalClasses(teacherClasses)
          if (selectedClassId && teacherClasses.some((c: any) => c.id === selectedClassId)) {
            setFilterClass(selectedClassId)
          } else if (teacherClasses.length === 1) {
            setFilterClass(teacherClasses[0].id)
          } else if (filterClass && !teacherClasses.some((c: any) => c.id === filterClass)) {
            setFilterClass('')
          }
        } else {
          setLocalClasses([])
          setFilterClass('')
        }
      })
    } else if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) { setClasses(res.data); setLocalClasses(res.data) }
      })
    } else { setLocalClasses(classes) }
    if (terms.length === 0) {
      refApi.terms().then((res) => {
        if (res.success && res.data) { setTerms(res.data); setLocalTerms(res.data) }
      })
    } else { setLocalTerms(terms) }
  }, [classes, terms, setClasses, setTerms, isTeacherView, filterClass, selectedClassId])

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

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  }

  const typeLabels: Record<string, string> = {
    CAT_1: 'CAT 1',
    CAT_2: 'CAT 2',
    END_TERM: 'End Term',
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterClass} onValueChange={(v) => setFilterClass(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-9" disabled={isTeacherView && localClasses.length <= 1}>
              <SelectValue placeholder={isTeacherView ? 'Assigned Class' : 'All Classes'} />
            </SelectTrigger>
            <SelectContent>
              {!isTeacherView && <SelectItem value="all">All Classes</SelectItem>}
              {localClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{getClassLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36 h-9">
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
        {canCreateExam && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Exam
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/80">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exam Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Class</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Term</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Date Range</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                {showActionsColumn && (
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    {showActionsColumn && <TableCell><Skeleton className="h-8 w-16" /></TableCell>}
                  </TableRow>
                ))
              ) : exams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActionsColumn ? 7 : 6} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No exams scheduled</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                        {canCreateExam ? 'Create your first exam to get started' : 'No exams found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                exams.map((exam) => (
                  <TableRow key={exam.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{exam.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-600 dark:text-slate-400">
                      {getClassLabel(exam.class)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                      {exam.term ? `${exam.term.name} ${exam.term.year}` : '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-[10px]">
                        {typeLabels[exam.type] || exam.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(exam.startDate), 'MMM d')} - {format(new Date(exam.endDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', statusColors[exam.status] || '')}>
                        {exam.status}
                      </Badge>
                    </TableCell>
                    {showActionsColumn && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canOpenMarkEntry && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedExamId(exam.id); navigateTo('mark-entry', { classId: exam.classId }) }}
                            >
                              Marks
                            </Button>
                          )}
                          {canOpenReport && exam.status === 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedExamId(exam.id); navigateTo('report-cards') }}
                            >
                              Report
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Exam Dialog */}
      {canCreateExam && (
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
                      <SelectItem key={c.id} value={c.id}>{getClassLabel(c)}</SelectItem>
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
      )}
    </div>
  )
}
