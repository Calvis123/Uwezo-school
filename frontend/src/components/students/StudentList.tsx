'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Download,
  Upload,
  Filter,
  GraduationCap,
  ListChecks,
  Mail,
  FileDown,
  Printer,
  LayoutGrid,
  ArrowRight,
  UserRoundPlus,
  Link2,
  Bus,
  LockKeyhole,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImportStudentsDialog } from './ImportStudentsDialog'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { studentsApi, refApi } from '@/lib/api'
import { StudentForm } from './StudentForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getInitials, getAvatarColor } from '@/lib/avatar'

interface StudentRow {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  studentType?: 'DAY' | 'BOARDING'
  transportInfo?: {
    status: 'BOARDING' | 'UNPAID' | 'PAID_UNASSIGNED' | 'ASSIGNED'
    paidAmount?: number
    bus?: { id: string; busNumber: string; routeName: string } | null
  }
  feeInfo?: {
    status: 'UNPAID' | 'PARTIAL' | 'PAID'
    expectedAmount?: number
    paidAmount?: number
    balance?: number
  }
  class?: { id: string; name: string; stream?: string | null }
  status: string
  feesDue?: number
  guardians?: Array<{
    relationship?: string
    guardian?: {
      name?: string
      phone?: string
      email?: string
    }
  }>
}

const classLevelOrder: Record<string, number> = {
  PP1: 0,
  PP2: 1,
  GRADE_1: 2,
  GRADE_2: 3,
  GRADE_3: 4,
  GRADE_4: 5,
  GRADE_5: 6,
  GRADE_6: 7,
  GRADE_7: 8,
  GRADE_8: 9,
  GRADE_9: 10,
}

const getClassDisplayName = (classItem?: { name?: string; stream?: string | null }) => {
  if (!classItem) return '-'
  const name = classItem.name || 'Class'
  const stream = classItem.stream?.trim()
  if (!stream) return name
  if (new RegExp(`\\s+${stream}$`, 'i').test(name)) return name
  return `${name} ${stream}`
}

const sortClassesByLevelAndStream = (items: any[]) => {
  return [...items].sort((a, b) => {
    const levelDiff = (classLevelOrder[a.level] ?? 99) - (classLevelOrder[b.level] ?? 99)
    if (levelDiff !== 0) return levelDiff
    const nameDiff = String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' })
    if (nameDiff !== 0) return nameDiff
    return String(a.stream || '').localeCompare(String(b.stream || ''), undefined, { numeric: true, sensitivity: 'base' })
  })
}

export function StudentList() {
  const { navigateTo, classes, setClasses, user, selectedClassId } = useAppStore()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState(selectedClassId || '')
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [filterStudentType, setFilterStudentType] = useState<'ALL' | 'DAY' | 'BOARDING'>('ALL')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<any | null>(null)
  const [linkParentStudent, setLinkParentStudent] = useState<StudentRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [linkParentLoading, setLinkParentLoading] = useState(false)
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentRelationship, setParentRelationship] = useState('GUARDIAN')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [loadError, setLoadError] = useState<string | null>(null)
  const canAddStudent = ['SUPER_ADMIN', 'HEADTEACHER', 'SECRETARY'].includes(user?.role || '')
  const canViewParentInfo = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR'].includes(user?.role || '')
  const canLinkParent = canViewParentInfo
  const canViewFeeTransport = user?.role !== 'TEACHER'
  const isTeacherView = user?.role === 'TEACHER'
  const classFilterOptions = useMemo(() => sortClassesByLevelAndStream(localClasses), [localClasses])
  const assignedClass = useMemo(
    () => classFilterOptions.find((c) => c.id === filterClass) || (isTeacherView && classFilterOptions.length === 1 ? classFilterOptions[0] : undefined),
    [classFilterOptions, filterClass, isTeacherView]
  )
  const assignedClassId = assignedClass?.id || selectedClassId || ''

  // On mobile, default to card view
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)')
    if (mql.matches) setViewMode('card')
    const handler = (e: MediaQueryListEvent) => setViewMode(e.matches ? 'card' : 'table')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const totalPages = Math.ceil(total / limit)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await studentsApi.list({
        page,
        limit,
        classId: filterClass,
        status: filterStatus,
        studentType: filterStudentType === 'ALL' ? undefined : filterStudentType,
        search,
      })
      if (result.success && result.data) {
        setStudents(result.data.items || [])
        setTotal(result.data.total || 0)
      } else {
        setStudents([])
        setTotal(0)
        setLoadError(result.error || 'Failed to load students')
      }
    } catch {
      setStudents([])
      setTotal(0)
      setLoadError('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [page, limit, filterClass, filterStatus, filterStudentType, search])

  useEffect(() => {
    refApi.classes().then((res) => {
      if (res.success && res.data) {
        setClasses(res.data)
        setLocalClasses(res.data)
      } else {
        setLocalClasses(classes)
      }
    }).catch(() => {
      setLocalClasses(classes)
    })
  }, [classes, setClasses])

  useEffect(() => {
    if (selectedClassId && selectedClassId !== filterClass) {
      setFilterClass(selectedClassId)
      setPage(1)
    }
  }, [selectedClassId])

  useEffect(() => {
    if (!isTeacherView) return
    const targetClassId = selectedClassId || (localClasses.length === 1 ? localClasses[0].id : '')
    if (targetClassId && filterClass !== targetClassId) {
      setFilterClass(targetClassId)
      setPage(1)
    }
  }, [isTeacherView, filterClass, localClasses, selectedClassId])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const result = await studentsApi.delete(deleteId)
      if (result.success) {
        toast.success('Student deleted successfully')
        loadStudents()
      } else {
        toast.error(result.error || 'Failed to delete student')
      }
    } catch {
      toast.error('An error occurred')
    }
    setDeleteId(null)
  }

  const openLinkParentDialog = (student: StudentRow) => {
    const existing = student.guardians?.[0]
    setLinkParentStudent(student)
    setParentName(existing?.guardian?.name || '')
    setParentPhone(existing?.guardian?.phone || '')
    setParentRelationship(existing?.relationship || 'GUARDIAN')
  }

  const handleLinkParent = async () => {
    if (!linkParentStudent?.id) return
    if (!parentName.trim() || !parentPhone.trim()) {
      toast.error('Parent name and phone are required')
      return
    }

    setLinkParentLoading(true)
    try {
      const result = await studentsApi.update(linkParentStudent.id, {
        guardianName: parentName.trim(),
        guardianPhone: parentPhone.trim(),
        guardianRelationship: parentRelationship,
      })

      if (result.success) {
        const creds = result.data?.parentPortalCredentials
        toast.success('Parent linked successfully', {
          description: creds?.isNewAccount
            ? `Login phone: ${creds.phone}  -  Default password: ${creds.password}`
            : creds?.phone
              ? `Login phone: ${creds.phone}`
              : 'Parent account linked to this student.',
        })
        setLinkParentStudent(null)
        setParentName('')
        setParentPhone('')
        setParentRelationship('GUARDIAN')
        loadStudents()
      } else {
        toast.error(result.error || 'Failed to link parent')
      }
    } catch {
      toast.error('Failed to link parent')
    } finally {
      setLinkParentLoading(false)
    }
  }

  const statusConfig: Record<string, { className: string; label: string }> = {
    ACTIVE: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Active' },
    INACTIVE: { className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600', label: 'Inactive' },
    GRADUATED: { className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Graduated' },
    TRANSFERRED: { className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', label: 'Transferred' },
  }
  const studentTypeConfig: Record<'DAY' | 'BOARDING', { className: string; label: string }> = {
    DAY: {
      className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
      label: 'Day Scholar',
    },
    BOARDING: {
      className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800',
      label: 'Boarding',
    },
  }
  const transportStatusConfig: Record<'BOARDING' | 'UNPAID' | 'PAID_UNASSIGNED' | 'ASSIGNED', { className: string; label: string }> = {
    BOARDING: {
      className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      label: 'N/A (Boarding)',
    },
    UNPAID: {
      className: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
      label: 'Transport Unpaid',
    },
    PAID_UNASSIGNED: {
      className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
      label: 'Paid - Pending Bus',
    },
    ASSIGNED: {
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
      label: 'Bus Assigned',
    },
  }
  const feeStatusConfig: Record<'UNPAID' | 'PARTIAL' | 'PAID', { className: string; label: string }> = {
    UNPAID: {
      className: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
      label: 'Fees Unpaid',
    },
    PARTIAL: {
      className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
      label: 'Fees Partial',
    },
    PAID: {
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
      label: 'Fees Paid',
    },
  }

  const pageActiveCount = students.filter(s => s.status === 'ACTIVE').length
  const pageInactiveCount = students.filter(s => s.status === 'INACTIVE').length
  const dayScholarCount = students.filter((s) => (s.studentType || 'DAY') === 'DAY').length
  const boardingCount = students.filter((s) => s.studentType === 'BOARDING').length
  const transportPendingCount = students.filter((s) => s.transportInfo?.status === 'PAID_UNASSIGNED').length
  const transportAssignedCount = students.filter((s) => s.transportInfo?.status === 'ASSIGNED').length
  const hasActiveFilters =
    Boolean(search.trim()) ||
    (!isTeacherView && Boolean(filterClass)) ||
    filterStatus !== 'ACTIVE' ||
    (canViewFeeTransport && filterStudentType !== 'ALL')

  // Generate page numbers for pagination with ellipsis
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Students</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} students found
            {filterStatus === 'ACTIVE' && <span className="text-green-600 dark:text-green-400 ml-1">(showing active)</span>}
            {filterStatus === 'INACTIVE' && <span className="text-slate-500 ml-1">(showing inactive)</span>}
            {filterStatus === '' && <span className="text-slate-500 ml-1">(all statuses)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {canAddStudent && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-slate-600 dark:text-slate-400 hidden sm:flex"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="w-3.5 h-3.5" />
                Import
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm h-9"
                onClick={() => {
                  setEditStudent(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{total}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">{filterStatus === 'ACTIVE' ? total : pageActiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Inactive</p>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400 tabular-nums">{filterStatus === 'INACTIVE' ? total : pageInactiveCount}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {canViewFeeTransport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                    <Bus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Transport Pending</p>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{transportPendingCount}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {transportAssignedCount} assigned - {dayScholarCount} day - {boardingCount} boarding
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder={isTeacherView ? 'Search by name or admission number...' : 'Search by name, admission number, or class...'}
            className="pl-9 h-10 bg-white dark:bg-slate-800"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            aria-label="Search students"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 h-10">
            <button
              onClick={() => setViewMode('table')}
              type="button"
              aria-label="Switch to table view"
              aria-pressed={viewMode === 'table'}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 btn-press',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
              title="Table view"
            >
              <ListChecks className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              type="button"
              aria-label="Switch to card view"
              aria-pressed={viewMode === 'card'}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 btn-press',
                viewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {isTeacherView ? (
            <div className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:w-56">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {assignedClass ? getClassDisplayName(assignedClass) : 'Assigned class'}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Assigned class
                </p>
              </div>
              <LockKeyhole className="h-4 w-4 flex-shrink-0 text-slate-400" />
            </div>
          ) : (
            <Select value={filterClass} onValueChange={(v) => { setFilterClass(v === 'all' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classFilterOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{getClassDisplayName(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-40 h-10 bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="GRADUATED">Graduated</SelectItem>
              <SelectItem value="TRANSFERRED">Transferred</SelectItem>
            </SelectContent>
          </Select>
          {canViewFeeTransport && (
            <Select value={filterStudentType} onValueChange={(v) => { setFilterStudentType(v as 'ALL' | 'DAY' | 'BOARDING'); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
                <SelectValue placeholder="All Student Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Student Types</SelectItem>
                <SelectItem value="DAY">Day Scholar</SelectItem>
                <SelectItem value="BOARDING">Boarding</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10"
            disabled={!hasActiveFilters}
            onClick={() => {
              setSearch('')
              setFilterClass(isTeacherView ? assignedClassId : '')
              setFilterStatus('ACTIVE')
              setFilterStudentType('ALL')
              setPage(1)
            }}
          >
            Clear Filters
          </Button>
          {!isTeacherView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto h-10 gap-2 text-slate-600 dark:text-slate-400">
                  <ListChecks className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => toast.info('Select students first')}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Select students first')}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info('Select students first')}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
                    navigateTo('promotions')
                  } else {
                    toast.error('Only administrators can promote students')
                  }
                }}>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Promote
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info('Select students first')} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {/* Table / Card View */}
      {viewMode === 'table' ? (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
          <Table className="w-full">
            <caption className="sr-only">
              Students registry with identity, class, status, and actions
            </caption>
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <TableRow className="hover:bg-slate-50/95 dark:hover:bg-slate-800/95">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10 text-center">#</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Admission #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Gender</TableHead>
                {canViewFeeTransport && (
                  <>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Transport</TableHead>
                  </>
                )}
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Class</TableHead>
                {canViewParentInfo && (
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Parent/Guardian</TableHead>
                )}
                {canViewFeeTransport && (
                  <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Fees Due</TableHead>
                )}
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    {canViewFeeTransport && (
                      <>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                      </>
                    )}
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    {canViewParentInfo && <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>}
                    {canViewFeeTransport && <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6 + (canViewParentInfo ? 1 : 0) + (canViewFeeTransport ? 3 : 0)} className="text-center py-12">
                    <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No students found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => {
                  const statusCfg = statusConfig[student.status] || statusConfig.ACTIVE
                  const typeKey = student.studentType === 'BOARDING' ? 'BOARDING' : 'DAY'
                  const studentTypeCfg = studentTypeConfig[typeKey]
                  const transportStatus = student.transportInfo?.status || (typeKey === 'BOARDING' ? 'BOARDING' : 'UNPAID')
                  const transportCfg = transportStatusConfig[transportStatus]
                  const feeStatus = student.feeInfo?.status || ((student.feesDue || 0) > 0 ? 'UNPAID' : 'PAID')
                  const feeCfg = feeStatusConfig[feeStatus]
                  const rowNumber = (page - 1) * limit + index + 1
                  const primaryGuardian = student.guardians?.[0]
                  return (
                    <TableRow
                      key={student.id}
                      className={cn(
                        'cursor-pointer transition-all duration-150 group',
                        'hover:bg-teal-50/50 dark:hover:bg-teal-900/20',
                        'hover:border-l-2 hover:border-l-teal-500',
                        index % 2 === 0
                          ? 'bg-white dark:bg-slate-800'
                          : 'bg-slate-50/50 dark:bg-slate-800/50'
                      )}
                      onClick={() => navigateTo('student-detail', { studentId: student.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigateTo('student-detail', { studentId: student.id })
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open details for ${student.firstName} ${student.lastName}`}
                    >
                      <TableCell className="text-xs font-mono text-slate-400 dark:text-slate-500 text-center">
                        {rowNumber}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(`${student.firstName} ${student.lastName}`).bg }}
                          >
                            {getInitials(student.firstName, student.lastName)}
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={cn(
                          'text-xs font-medium',
                          student.gender === 'MALE' ? 'text-sky-600 dark:text-sky-400' : 'text-pink-600 dark:text-pink-400'
                        )}>
                          {student.gender === 'MALE' ? 'Male' : 'Female'}
                        </span>
                      </TableCell>
                      {canViewFeeTransport && (
                        <>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-2 py-0.5 font-medium', studentTypeCfg.className)}
                            >
                              {studentTypeCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="leading-tight">
                              <Badge
                                variant="outline"
                                className={cn('text-[10px] px-2 py-0.5 font-medium', transportCfg.className)}
                              >
                                {transportCfg.label}
                              </Badge>
                              {transportStatus === 'ASSIGNED' && student.transportInfo?.bus?.busNumber ? (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                  {student.transportInfo.bus.busNumber}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                        {getClassDisplayName(student.class)}
                      </TableCell>
                      {canViewParentInfo && (
                        <TableCell className="hidden lg:table-cell">
                          {primaryGuardian?.guardian?.name ? (
                            <div className="leading-tight">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {primaryGuardian.guardian.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {primaryGuardian.guardian.phone || primaryGuardian.guardian.email || 'No contact'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">Not linked</span>
                          )}
                        </TableCell>
                      )}
                      {canViewFeeTransport && (
                        <TableCell className="hidden lg:table-cell">
                          <div className="leading-tight">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-2 py-0.5 font-medium', feeCfg.className)}
                            >
                              {feeCfg.label}
                            </Badge>
                            {typeof student.feeInfo?.balance === 'number' && student.feeInfo.balance > 0 ? (
                              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                                Balance: KES {student.feeInfo.balance.toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5 font-medium', statusCfg.className)}
                        >
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right sm:w-10" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100" title="Actions">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigateTo('student-detail', { studentId: student.id })}>
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditStudent(student); setFormOpen(true) }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {canLinkParent && (
                              <DropdownMenuItem onClick={() => openLinkParentDialog(student)}>
                                <UserRoundPlus className="w-4 h-4 mr-2" /> Link Parent
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                              onClick={() => setDeleteId(student.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      ) : (
        // Mobile Card View
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))
          ) : students.length === 0 ? (
            <div className="col-span-2 text-center py-12">
              <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No students found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            students.map((student) => {
              const statusCfg = statusConfig[student.status] || statusConfig.ACTIVE
              const typeKey = student.studentType === 'BOARDING' ? 'BOARDING' : 'DAY'
              const studentTypeCfg = studentTypeConfig[typeKey]
              const transportStatus = student.transportInfo?.status || (typeKey === 'BOARDING' ? 'BOARDING' : 'UNPAID')
              const transportCfg = transportStatusConfig[transportStatus]
              const feeStatus = student.feeInfo?.status || ((student.feesDue || 0) > 0 ? 'UNPAID' : 'PAID')
              const feeCfg = feeStatusConfig[feeStatus]
              const primaryGuardian = student.guardians?.[0]
              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card
                    className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow duration-200 cursor-pointer active:scale-[0.99]"
                    onClick={() => navigateTo('student-detail', { studentId: student.id })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: getAvatarColor(`${student.firstName} ${student.lastName}`).bg }}
                        >
                          {getInitials(student.firstName, student.lastName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {student.admissionNumber}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {getClassDisplayName(student.class)}
                            </span>
                            <span className={cn(
                              'text-[10px] px-2 py-0.5 font-medium',
                              statusCfg.className
                            )}>
                              {statusCfg.label}
                            </span>
                            {canViewFeeTransport && (
                              <>
                                <span className={cn(
                                  'text-[10px] px-2 py-0.5 font-medium rounded border',
                                  studentTypeCfg.className
                                )}>
                                  {studentTypeCfg.label}
                                </span>
                                <span className={cn(
                                  'text-[10px] px-2 py-0.5 font-medium rounded border',
                                  transportCfg.className
                                )}>
                                  {transportStatus === 'ASSIGNED' && student.transportInfo?.bus?.busNumber
                                    ? `${transportCfg.label}: ${student.transportInfo.bus.busNumber}`
                                    : transportCfg.label}
                                </span>
                                <span className={cn(
                                  'text-[10px] px-2 py-0.5 font-medium rounded border',
                                  feeCfg.className
                                )}>
                                  {feeCfg.label}
                                </span>
                              </>
                            )}
                          </div>
                          {canViewParentInfo && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Parent: {primaryGuardian?.guardian?.name || 'Not linked'}
                              {primaryGuardian?.guardian?.phone ? `  -  ${primaryGuardian.guardian.phone}` : ''}
                            </p>
                          )}
                          {canViewFeeTransport && typeof student.feeInfo?.balance === 'number' && student.feeInfo.balance > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1.5">
                              Fee balance: KES {student.feeInfo.balance.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigateTo('student-detail', { studentId: student.id })
                          }}
                          title="View details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                        {canLinkParent && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                            onClick={(e) => {
                              e.stopPropagation()
                              openLinkParentDialog(student)
                            }}
                            title="Link parent"
                          >
                            <Link2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {getPageNumbers().map((pageNum, i) => {
              if (pageNum === '...') {
                return (
                  <span key={`ellipsis-${i}`} className="px-2 text-sm text-slate-400 dark:text-slate-500">
                    ...
                  </span>
                )
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className={cn(
                    'h-8 w-8 min-w-[2rem] transition-all',
                    page === pageNum
                      ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Student Form Dialog */}
      <StudentForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditStudent(null) }}
        editStudent={editStudent}
        onSuccess={loadStudents}
      />

      {/* Link Parent Dialog */}
      <Dialog open={!!linkParentStudent} onOpenChange={(open) => !open && setLinkParentStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Parent / Guardian</DialogTitle>
            <DialogDescription>
              {linkParentStudent
                ? `Set parent portal login details for ${linkParentStudent.firstName} ${linkParentStudent.lastName}.`
                : 'Set parent portal login details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Parent Name</Label>
              <Input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent/Guardian full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="0712345678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select value={parentRelationship} onValueChange={setParentRelationship}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FATHER">Father</SelectItem>
                  <SelectItem value="MOTHER">Mother</SelectItem>
                  <SelectItem value="GUARDIAN">Guardian</SelectItem>
                  <SelectItem value="UNCLE">Uncle</SelectItem>
                  <SelectItem value="AUNT">Aunt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkParentStudent(null)} disabled={linkParentLoading}>
              Cancel
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleLinkParent} disabled={linkParentLoading}>
              {linkParentLoading ? 'Saving...' : 'Save Parent Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Students Dialog */}
      <ImportStudentsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={loadStudents}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this student? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

