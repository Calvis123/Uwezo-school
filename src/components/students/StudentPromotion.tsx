'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { promotionsApi, classesApi, studentsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClassItem {
  id: string
  name: string
  level: string
  stream: string | null
  capacity: number
  studentCount: number
}

interface PromotionItem {
  id: string
  studentId: string
  student: { id: string; firstName: string; lastName: string; admissionNumber: string }
  fromClass: { id: string; name: string; stream: string | null }
  toClass: { id: string; name: string; stream: string | null }
  academicYear: string
  term: string
  status: string
  promotedBy: string
  notes: string
  completedAt: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  COMPLETED: CheckCircle2,
}

export function StudentPromotion() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  // Data state
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState({ total: 0, PENDING: 0, APPROVED: 0, COMPLETED: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('2025')
  const [searchQuery, setSearchQuery] = useState('')

  // Promotion wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [fromClassId, setFromClassId] = useState('')
  const [toClassId, setToClassId] = useState('')
  const [fromStudents, setFromStudents] = useState<any[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [promoting, setPromoting] = useState(false)
  const [promoteResult, setPromoteResult] = useState<any>(null)

  // Cancel confirmation
  const [cancelId, setCancelId] = useState<string | null>(null)

  // Load promotions
  const loadPromotions = async () => {
    setLoading(true)
    try {
      const res = await promotionsApi.history({
        academicYear: filterYear || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery || undefined,
        page,
        limit: 20,
      })
      if (res.success) {
        setPromotions(res.data.promotions)
        setTotal(res.data.pagination.total)
        setStats(res.data.stats)
      }
    } catch (err) {
      console.error('Failed to load promotions:', err)
    }
    setLoading(false)
  }

  // Load classes
  const loadClasses = async () => {
    try {
      const res = await classesApi.list({ status: 'ACTIVE' })
      if (res.success) {
        setClasses(res.data.classes || res.data || [])
      }
    } catch (err) {
      console.error('Failed to load classes:', err)
    }
  }

  useEffect(() => {
    let cancelled = false
    promotionsApi.history({
      academicYear: filterYear || undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      search: searchQuery || undefined,
      page,
      limit: 20,
    }).then(res => {
      if (res.success && !cancelled) {
        setPromotions(res.data.promotions)
        setTotal(res.data.pagination.total)
        setStats(res.data.stats)
      }
      if (!cancelled) setLoading(false)
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filterYear, filterStatus, searchQuery, page])

  useEffect(() => {
    let cancelled = false
    classesApi.list({ status: 'ACTIVE' }).then(res => {
      if (res.success && !cancelled) {
        setClasses(res.data.classes || res.data || [])
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (fromClassId) {
      let cancelled = false
      studentsApi.list({ classId: fromClassId, status: 'ACTIVE', limit: 200 }).then(res => {
        if (res.success && !cancelled) {
          setFromStudents(res.data.students || [])
          setToClassId('')
          setSelectedStudentIds([])
        }
      })
      return () => { cancelled = true }
    }
  }, [fromClassId])

  const totalPages = Math.ceil(total / 20)

  const getFromClass = (id: string) => classes.find(c => c.id === id)
  const getToClass = (id: string) => classes.find(c => c.id === id)
  const fromClass = fromClassId ? getFromClass(fromClassId) : null
  const toClass = toClassId ? getToClass(toClassId) : null

  // Promotion wizard handlers
  const openWizard = () => {
    setWizardStep(1)
    setFromClassId('')
    setToClassId('')
    setSelectedStudentIds([])
    setPromoteResult(null)
    setWizardOpen(true)
  }

  const canProceedStep2 = !!fromClassId && fromStudents.length > 0
  const canProceedStep3 = !!toClassId && toClassId !== fromClassId && selectedStudentIds.length > 0

  const handlePromote = async () => {
    setPromoting(true)
    try {
      const res = await promotionsApi.promote({
        studentIds: selectedStudentIds,
        fromClassId,
        toClassId,
        academicYear: filterYear || '2025',
        term: 'TERM_1',
        promotedBy: user?.id || '',
      })
      if (res.success) {
        setPromoteResult(res.data)
        setWizardStep(5)
        toast.success(`Successfully promoted ${res.data.promoted} student(s)`)
        loadPromotions()
        loadClasses()
      } else {
        toast.error(res.error || 'Promotion failed')
      }
    } catch (err) {
      toast.error('Promotion failed')
    }
    setPromoting(false)
  }

  const handleCancel = async () => {
    if (!cancelId) return
    try {
      const res = await promotionsApi.cancel(cancelId)
      if (res.success) {
        toast.success('Promotion cancelled and student reverted')
        loadPromotions()
        loadClasses()
      }
    } catch (err) {
      toast.error('Failed to cancel promotion')
    }
    setCancelId(null)
  }

  const toggleAllStudents = () => {
    if (selectedStudentIds.length === fromStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(fromStudents.map((s: any) => s.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-teal-600" />
            Student Promotion
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage student class promotions and graduations
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openWizard} className="bg-teal-600 hover:bg-teal-700 text-white">
            <ArrowRight className="h-4 w-4 mr-2" />
            New Promotion
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Promotions', value: stats.total, icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
          { label: `This Year (${filterYear})`, value: stats.COMPLETED, icon: CheckCircle2, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20' },
          { label: 'Pending Approval', value: stats.PENDING, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Recently Completed', value: stats.COMPLETED, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className={`${stat.bg} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="dark:bg-slate-800/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by student name or admission number..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                  className="pl-9 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <Select value={filterYear} onValueChange={v => { setFilterYear(v); setPage(1) }}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[160px] bg-white dark:bg-slate-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Promotion History Table */}
      <Card className="dark:bg-slate-800/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <GraduationCap className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No promotions found</p>
              <p className="text-sm mt-1">Promotions will appear here after creating one</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Date</th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Student</th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">From</th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400"></th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">To</th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Year</th>
                    <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    {isAdmin && <th className="text-left p-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p, i) => {
                    const StatusIcon = STATUS_ICONS[p.status] || Clock
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {new Date(p.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {p.student.firstName} {p.student.lastName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.student.admissionNumber}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 dark:text-slate-300">{p.fromClass.name}</span>
                          {p.fromClass.stream && (
                            <Badge variant="outline" className="ml-1 text-xs">{p.fromClass.stream}</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <ArrowRight className="h-4 w-4 text-teal-500" />
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 dark:text-slate-300">{p.toClass.name}</span>
                          {p.toClass.stream && (
                            <Badge variant="outline" className="ml-1 text-xs">{p.toClass.stream}</Badge>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{p.academicYear}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ''}`}>
                            <StatusIcon className="h-3 w-3" />
                            {p.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-3">
                            {(p.status === 'COMPLETED') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelId(p.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Revert
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && promotions.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={pageNum === page ? 'bg-teal-600 hover:bg-teal-700' : ''}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && (
                  <span className="px-2 text-slate-400">...</span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotion Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={open => { if (!open) setWizardOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-teal-600" />
              Student Promotion Wizard
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 && 'Step 1: Select the source class to promote students from'}
              {wizardStep === 2 && 'Step 2: Select the target class'}
              {wizardStep === 3 && 'Step 3: Select students to promote'}
              {wizardStep === 4 && 'Step 4: Review and confirm the promotion'}
              {wizardStep === 5 && 'Promotion complete!'}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4 px-4">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s < wizardStep ? 'bg-teal-600 text-white' :
                  s === wizardStep ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-2 border-teal-500' :
                  'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                }`}>
                  {s < wizardStep ? '✓' : s}
                </div>
                {s < 5 && (
                  <div className={`h-0.5 w-8 transition-colors ${s < wizardStep ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select Source Class */}
          {wizardStep === 1 && (
            <div className="space-y-4 px-4">
              <div>
                <Label className="mb-2 block">Source Class</Label>
                <Select value={fromClassId} onValueChange={v => { setFromClassId(v); setWizardStep(2) }}>
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select class to promote from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .sort((a, b) => {
                        const order: Record<string, number> = { PRE_NURSERY: 0, NURSERY: 1, PP1: 2, PP2: 3, GRADE_1: 4, GRADE_2: 5, GRADE_3: 6, GRADE_4: 7, GRADE_5: 8, GRADE_6: 9 }
                        return (order[a.level] ?? 99) - (order[b.level] ?? 99)
                      })
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.stream ? `(${c.stream})` : ''} — {c.studentCount} students
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Select Target Class */}
          {wizardStep === 2 && (
            <div className="space-y-4 px-4">
              <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center">
                  <Users className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{fromClass?.name} {fromClass?.stream}</p>
                  <p className="text-sm text-slate-500">{fromStudents.length} active students</p>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Target Class (promote to)</Label>
                <Select value={toClassId} onValueChange={v => setToClassId(v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select target class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter(c => c.id !== fromClassId)
                      .sort((a, b) => {
                        const order: Record<string, number> = { PRE_NURSERY: 0, NURSERY: 1, PP1: 2, PP2: 3, GRADE_1: 4, GRADE_2: 5, GRADE_3: 6, GRADE_4: 7, GRADE_5: 8, GRADE_6: 9 }
                        return (order[a.level] ?? 99) - (order[b.level] ?? 99)
                      })
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.stream ? `(${c.stream})` : ''} — {c.studentCount}/{c.capacity} enrolled
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {toClassId && toClass && (
                <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                  <p className="text-sm text-sky-800 dark:text-sky-300">
                    <strong>{toClass.name} {toClass.stream}</strong> currently has <strong>{toClass.studentCount}</strong> students (capacity: {toClass.capacity}).
                    {toClass.studentCount + selectedStudentIds.length > toClass.capacity && (
                      <span className="text-amber-600 block mt-1">
                        <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                        Warning: Adding {selectedStudentIds.length} students would exceed capacity.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setWizardStep(3)}
                  disabled={!toClassId || toClassId === fromClassId}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Students */}
          {wizardStep === 3 && (
            <div className="space-y-4 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Select Students to Promote</Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedStudentIds.length} of {fromStudents.length} students selected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllStudents}
                >
                  {selectedStudentIds.length === fromStudents.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                    <tr>
                      <th className="p-2 w-10">
                        <Checkbox
                          checked={selectedStudentIds.length === fromStudents.length && fromStudents.length > 0}
                          onCheckedChange={toggleAllStudents}
                        />
                      </th>
                      <th className="p-2 text-left font-medium text-slate-500">#</th>
                      <th className="p-2 text-left font-medium text-slate-500">Name</th>
                      <th className="p-2 text-left font-medium text-slate-500">Admission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fromStudents.map((s: any, i: number) => (
                      <tr
                        key={s.id}
                        className={`border-t border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
                          selectedStudentIds.includes(s.id) ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                        onClick={() => {
                          setSelectedStudentIds(prev =>
                            prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          )
                        }}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={selectedStudentIds.includes(s.id)}
                            onCheckedChange={() => {
                              setSelectedStudentIds(prev =>
                                prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                              )
                            }}
                          />
                        </td>
                        <td className="p-2 text-slate-500">{i + 1}</td>
                        <td className="p-2 font-medium text-slate-900 dark:text-white">
                          {s.lastName}, {s.firstName}
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">{s.admissionNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setWizardStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setWizardStep(4)}
                  disabled={selectedStudentIds.length === 0}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Review ({selectedStudentIds.length} students) <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {wizardStep === 4 && (
            <div className="space-y-4 px-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-400">Confirm Promotion</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This will immediately move <strong>{selectedStudentIds.length} student(s)</strong> from{' '}
                      <strong>{fromClass?.name} {fromClass?.stream}</strong> to{' '}
                      <strong>{toClass?.name} {toClass?.stream}</strong>.
                      This action can be reversed later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase">From</p>
                  <p className="font-bold text-slate-900 dark:text-white">{fromClass?.name}</p>
                  {fromClass?.stream && <Badge variant="outline">{fromClass.stream}</Badge>}
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-teal-500" />
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <p className="text-xs text-teal-600 dark:text-teal-400 uppercase">To</p>
                  <p className="font-bold text-slate-900 dark:text-white">{toClass?.name}</p>
                  {toClass?.stream && <Badge variant="outline">{toClass.stream}</Badge>}
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2 text-left font-medium text-slate-500">#</th>
                      <th className="p-2 text-left font-medium text-slate-500">Student Name</th>
                      <th className="p-2 text-left font-medium text-slate-500">Admission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fromStudents
                      .filter((s: any) => selectedStudentIds.includes(s.id))
                      .map((s: any, i: number) => (
                        <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700/50">
                          <td className="p-2 text-slate-500">{i + 1}</td>
                          <td className="p-2 font-medium text-slate-900 dark:text-white">{s.lastName}, {s.firstName}</td>
                          <td className="p-2 text-slate-500 dark:text-slate-400">{s.admissionNumber}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setWizardStep(3)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handlePromote}
                  disabled={promoting}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {promoting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Confirm Promotion
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {wizardStep === 5 && promoteResult && (
            <div className="space-y-4 px-4 text-center py-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Promotion Successful!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {promoteResult.promoted} student(s) promoted from {promoteResult.fromClass} to {promoteResult.toClass}
                </p>
              </div>
              <Button onClick={() => setWizardOpen(false)} className="bg-teal-600 hover:bg-teal-700">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel/Revert Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={open => { if (!open) setCancelId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel this promotion and move the student back to their original class. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Revert Promotion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
