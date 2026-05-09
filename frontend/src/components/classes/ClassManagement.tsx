'use client'

import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Plus,
  Search,
  GraduationCap,
  Users,
  MoreHorizontal,
  Pencil,
  Eye,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  UsersRound,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { readJson } from '@/lib/read-json'
import { motion, AnimatePresence } from 'framer-motion'
import { studentsApi, usersApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface ClassItem {
  id: string
  name: string
  level: string
  stream?: string
  teacherId?: string
  capacity?: number
  status: string
  studentCount: number
}

interface Teacher {
  id: string
  name: string
  email: string
  role: string
}

interface StudentRow {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  status: string
  studentType?: string
  guardians?: Array<{
    guardian?: {
      name?: string
      phone?: string
      email?: string
    }
  }>
  feeInfo?: {
    status: string
    expectedAmount: number
    paidAmount: number
    balance: number
  }
  transportInfo?: {
    status: string
    paidAmount?: number
    bus?: {
      busNumber: string
      routeName: string
    } | null
  }
}

interface ClassGroup {
  key: string
  name: string
  level: string
  classes: ClassItem[]
}

interface ClassSection {
  key: string
  title: string
  groups: ClassGroup[]
}

// ==================== Constants ====================

const LEVEL_OPTIONS = [
  { value: 'PLAYGROUP', label: 'Playgroup' },
  { value: 'PP1', label: 'PP1' },
  { value: 'PP2', label: 'PP2' },
  { value: 'GRADE_1', label: 'Grade 1' },
  { value: 'GRADE_2', label: 'Grade 2' },
  { value: 'GRADE_3', label: 'Grade 3' },
  { value: 'GRADE_4', label: 'Grade 4' },
  { value: 'GRADE_5', label: 'Grade 5' },
  { value: 'GRADE_6', label: 'Grade 6' },
  { value: 'GRADE_7', label: 'Grade 7' },
  { value: 'GRADE_8', label: 'Grade 8' },
  { value: 'GRADE_9', label: 'Grade 9' },
]

const FILTER_LEVEL_OPTIONS = [
  { value: 'ECDE', label: 'ECDE' },
  ...LEVEL_OPTIONS,
]

const LEVEL_ORDER: Record<string, number> = {
  PLAYGROUP: 0,
  PRE_NURSERY: 0,
  NURSERY: 0,
  PP1: 1,
  PP2: 2,
  GRADE_1: 3,
  GRADE_2: 4,
  GRADE_3: 5,
  GRADE_4: 6,
  GRADE_5: 7,
  GRADE_6: 8,
  GRADE_7: 9,
  GRADE_8: 10,
  GRADE_9: 11,
}

const STREAM_OPTIONS = ['A', 'B', 'C']

const levelBadgeColors: Record<string, string> = {
  PLAYGROUP: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  PRE_NURSERY: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  NURSERY: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  PP1: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  PP2: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  GRADE_1: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_2: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_3: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_4: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_5: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_6: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  GRADE_7: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  GRADE_8: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  GRADE_9: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

const levelCardAccent: Record<string, string> = {
  PLAYGROUP: 'from-pink-500',
  PRE_NURSERY: 'from-pink-500',
  NURSERY: 'from-pink-500',
  PP1: 'from-pink-500',
  PP2: 'from-pink-500',
  GRADE_1: 'from-teal-500',
  GRADE_2: 'from-teal-500',
  GRADE_3: 'from-teal-500',
  GRADE_4: 'from-teal-500',
  GRADE_5: 'from-teal-500',
  GRADE_6: 'from-teal-500',
  GRADE_7: 'from-amber-500',
  GRADE_8: 'from-amber-500',
  GRADE_9: 'from-amber-500',
}

const statusConfig: Record<string, { className: string; label: string }> = {
  ACTIVE: {
    className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
    label: 'Active',
  },
  INACTIVE: {
    className: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600',
    label: 'Inactive',
  },
}

const getClassGroupName = (cls: ClassItem) => {
  const stream = cls.stream?.trim()
  if (!stream) return cls.name

  return cls.name.replace(new RegExp(`\\s+${stream}$`, 'i'), '')
}

const getStreamLabel = (cls: ClassItem) => {
  return cls.stream ? `Stream ${cls.stream}` : 'Default'
}

const getClassLevelValue = (cls: ClassItem) => {
  const baseName = getClassGroupName(cls).toLowerCase()
  if (
    baseName.includes('playgroup') ||
    baseName.includes('play group') ||
    baseName.includes('pre-nursery') ||
    baseName.includes('pre nursery') ||
    cls.level === 'PRE_NURSERY'
  ) return 'PLAYGROUP'
  if (
    baseName.includes('pp1') ||
    baseName.includes('pre-primary 1') ||
    baseName.includes('pre primary 1') ||
    baseName === 'nursery' ||
    cls.level === 'NURSERY'
  ) return 'PP1'
  if (
    baseName.includes('pp2') ||
    baseName.includes('pre-primary 2') ||
    baseName.includes('pre primary 2')
  ) return 'PP2'

  const gradeMatch = baseName.match(/grade\s*([1-9])/)
  if (gradeMatch) return `GRADE_${gradeMatch[1]}`

  return cls.level
}

const getCanonicalClassName = (level: string, fallback: string) => {
  return LEVEL_OPTIONS.find(l => l.value === level)?.label || fallback
}

const getClassLevelLabel = (cls: ClassItem) => {
  const levelValue = getClassLevelValue(cls)
  return LEVEL_OPTIONS.find(l => l.value === levelValue)?.label || levelValue
}

const getClassLevelOrder = (level: string) => LEVEL_ORDER[level] ?? 999

const isEcdeLevel = (level: string) => {
  return ['PLAYGROUP', 'PRE_NURSERY', 'NURSERY', 'PP1', 'PP2'].includes(level)
}

const formatCurrency = (amount?: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// ==================== Main Component ====================

export function ClassManagement() {
  const { navigateTo, user } = useAppStore()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedClassByGroup, setSelectedClassByGroup] = useState<Record<string, string>>({})

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    level: 'GRADE_1',
    stream: 'A',
    capacity: 40,
    teacherId: '',
    status: 'ACTIVE',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])

  // View students dialog
  const [viewStudentsOpen, setViewStudentsOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [classStudents, setClassStudents] = useState<StudentRow[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentPage, setStudentPage] = useState(1)
  const [studentTotal, setStudentTotal] = useState(0)

  // Deactivate dialog
  const [deactivateId, setDeactivateId] = useState<string | null>(null)

  // Assign teacher dialog
  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false)
  const [assignClassId, setAssignClassId] = useState<string | null>(null)
  const [assignTeacherId, setAssignTeacherId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const studentLimit = 100

  // ==================== Load Classes ====================
  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLevel !== 'all') params.set('level', filterLevel)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch(`/api/classes?${params.toString()}`)
      const data = await readJson<any>(res)
      if (data.success && data.data) {
        setClasses(data.data)
      } else {
        setClasses([])
        toast.error(data.error || 'Failed to load classes')
      }
    } catch {
      setClasses([])
      toast.error('Failed to load classes')
    } finally {
      setLoading(false)
    }
  }, [search, filterLevel, filterStatus])

  // ==================== Load Teachers ====================
  const loadTeachers = useCallback(async () => {
    try {
      const res = await usersApi.list({ role: 'TEACHER', limit: 100 })
      if (res.success && res.data) {
        setTeachers(res.data.items || [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  useEffect(() => {
    if (formOpen) loadTeachers()
  }, [formOpen, loadTeachers])

  // ==================== Computed Stats ====================
  const classGroups = useMemo<ClassGroup[]>(() => {
    const grouped = new Map<string, ClassGroup>()

    classes.forEach((cls) => {
      const levelValue = getClassLevelValue(cls)
      const groupName = getCanonicalClassName(levelValue, getClassGroupName(cls))
      const key = `${levelValue}::${groupName.toLowerCase()}`
      const group = grouped.get(key)

      if (group) {
        group.classes.push(cls)
      } else {
        grouped.set(key, {
          key,
          name: groupName,
          level: levelValue,
          classes: [cls],
        })
      }
    })

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        classes: [...group.classes].sort((a, b) => {
          const aStream = a.stream || ''
          const bStream = b.stream || ''
          return aStream.localeCompare(bStream, undefined, { numeric: true, sensitivity: 'base' })
        }),
      }))
      .sort((a, b) => {
        const levelDiff = getClassLevelOrder(a.level) - getClassLevelOrder(b.level)
        if (levelDiff !== 0) return levelDiff
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      })
  }, [classes])

  const totalClasses = classGroups.length
  const classSections = useMemo<ClassSection[]>(() => {
    const ecdeGroups = classGroups.filter(group => isEcdeLevel(group.level))
    const gradeGroups = classGroups.filter(group => !isEcdeLevel(group.level))

    return [
      ...(ecdeGroups.length > 0 ? [{ key: 'ecde', title: 'ECDE', groups: ecdeGroups }] : []),
      ...(gradeGroups.length > 0 ? [{ key: 'grades', title: 'Grade 1 - Grade 9', groups: gradeGroups }] : []),
    ]
  }, [classGroups])
  const activeClasses = classGroups.filter(group => group.classes.some(c => c.status === 'ACTIVE')).length
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
  const avgClassSize = activeClasses > 0 ? Math.round(totalStudents / activeClasses) : 0

  // ==================== Form Handlers ====================
  const openCreateForm = () => {
    setEditClass(null)
    setFormData({ name: '', level: 'PLAYGROUP', stream: 'A', capacity: 40, teacherId: '', status: 'ACTIVE' })
    setFormOpen(true)
  }

  const openEditForm = (cls: ClassItem) => {
    setEditClass(cls)
    setFormData({
      name: cls.name,
      level: getClassLevelValue(cls),
      stream: cls.stream || 'A',
      capacity: cls.capacity || 40,
      teacherId: cls.teacherId || '',
      status: cls.status || 'ACTIVE',
    })
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Class name is required')
      return
    }

    setFormLoading(true)
    try {
      const url = editClass ? `/api/classes/${editClass.id}` : '/api/classes'
      const method = editClass ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await readJson<any>(res)

      if (data.success) {
        toast.success(editClass ? 'Class updated successfully' : 'Class created successfully')
        setFormOpen(false)
        loadClasses()
      } else {
        toast.error(data.error || 'Operation failed')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setFormLoading(false)
    }
  }

  // ==================== Deactivate Handler ====================
  const handleDeactivate = async () => {
    if (!deactivateId) return
    try {
      const res = await fetch(`/api/classes/${deactivateId}`, { method: 'DELETE' })
      const data = await readJson<any>(res)
      if (data.success) {
        toast.success('Class deactivated successfully')
        loadClasses()
      } else {
        toast.error(data.error || 'Failed to deactivate class')
      }
    } catch {
      toast.error('An error occurred')
    }
    setDeactivateId(null)
  }

  // ==================== View Students ====================
  const openViewStudents = async (cls: ClassItem) => {
    setSelectedClass(cls)
    setStudentPage(1)
    setViewStudentsOpen(true)
    setStudentsLoading(true)
    try {
      const res = await studentsApi.list({ classId: cls.id, limit: studentLimit, page: 1, status: 'ACTIVE' })
      if (res.success && res.data) {
        setClassStudents(res.data.items || [])
        setStudentTotal(res.data.total || 0)
      } else {
        setClassStudents([])
        setStudentTotal(0)
      }
    } catch {
      setClassStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }

  const handleClassCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, cls: ClassItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openViewStudents(cls)
    }
  }

  useEffect(() => {
    if (viewStudentsOpen && selectedClass) {
      setStudentsLoading(true)
      studentsApi.list({ classId: selectedClass.id, limit: studentLimit, page: studentPage, status: 'ACTIVE' })
        .then(res => {
          if (res.success && res.data) {
            setClassStudents(res.data.items || [])
            setStudentTotal(res.data.total || 0)
          }
        })
        .catch(() => setClassStudents([]))
        .finally(() => setStudentsLoading(false))
    }
  }, [studentPage, viewStudentsOpen, selectedClass])

  // ==================== Assign Teacher ====================
  const openAssignTeacher = (cls: ClassItem) => {
    setAssignClassId(cls.id)
    setAssignTeacherId(cls.teacherId || '')
    setAssignTeacherOpen(true)
    loadTeachers()
  }

  const handleAssignTeacher = async () => {
    if (!assignClassId) return
    setAssignLoading(true)
    try {
      const res = await fetch(`/api/classes/${assignClassId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: assignTeacherId || null }),
      })
      const data = await readJson<any>(res)
      if (data.success) {
        toast.success('Teacher assigned successfully')
        setAssignTeacherOpen(false)
        loadClasses()
      } else {
        toast.error(data.error || 'Failed to assign teacher')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setAssignLoading(false)
    }
  }

  // ==================== Capacity Color ====================
  const getCapacityColor = (count: number, cap: number) => {
    const pct = cap > 0 ? (count / cap) * 100 : 0
    if (pct >= 90) return 'text-red-600 dark:text-red-400'
    if (pct >= 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getProgressColor = (count: number, cap: number) => {
    const pct = cap > 0 ? (count / cap) * 100 : 0
    if (pct >= 90) return '[&>div]:bg-red-500'
    if (pct >= 75) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-teal-500'
  }

  const studentTotalPages = Math.ceil(studentTotal / studentLimit)

  // ==================== Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Class Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage classes, assign teachers, and track enrollment
          </p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <Button
              variant="outline"
              className="h-9 gap-1.5 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/30"
              onClick={() => navigateTo('promotions')}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Promote Students</span>
            </Button>
          )}
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm h-9"
            onClick={openCreateForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Classes</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{totalClasses}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">{activeClasses}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Students</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{totalStudents}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Class Size</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{avgClassSize}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search classes..."
            className="pl-9 h-10 bg-white dark:bg-slate-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {FILTER_LEVEL_OPTIONS.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36 h-10 bg-white dark:bg-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="shadow-sm border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : classGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">No Classes Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {search || filterLevel !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first class'}
          </p>
          {!search && filterLevel === 'all' && filterStatus === 'all' && (
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={openCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          {classSections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{section.title}</h3>
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  {section.groups.length} classes
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
            {section.groups.map((group, index) => {
              const selectedId = selectedClassByGroup[group.key]
              const cls = group.classes.find(c => c.id === selectedId) || group.classes[0]
              const levelValue = getClassLevelValue(cls)
              const levelLabel = getClassLevelLabel(cls)
              const capacity = cls.capacity || 40
              const capacityPct = capacity > 0 ? Math.round((cls.studentCount / capacity) * 100) : 0
              const levelBadge = levelBadgeColors[levelValue] || levelBadgeColors.GRADE_1
              const accent = levelCardAccent[levelValue] || 'from-teal-500'
              const sConfig = statusConfig[cls.status] || statusConfig.ACTIVE

              return (
                <motion.div
                  key={group.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Card
                    role="button"
                    tabIndex={0}
                    aria-label={`View students and class data for ${cls.name}`}
                    onClick={() => openViewStudents(cls)}
                    onKeyDown={(event) => handleClassCardKeyDown(event, cls)}
                    className={cn(
                    'shadow-sm border bg-white dark:bg-slate-800 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
                    cls.status === 'ACTIVE'
                      ? 'border-slate-200/60 dark:border-slate-700/60'
                      : 'border-slate-200/40 dark:border-slate-700/40 opacity-70'
                  )}>
                    {/* Top accent bar */}
                    <div className={cn('h-1 bg-gradient-to-r', accent)} />

                    <CardContent className="p-4">
                      {/* Class name & actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {group.name}
                          </h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 flex-shrink-0"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44" onClick={(event) => event.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openEditForm(cls)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssignTeacher(cls)}>
                              <UserPlus className="w-4 h-4 mr-2" /> Assign Teacher
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openViewStudents(cls)}>
                              <Eye className="w-4 h-4 mr-2" /> View Students
                            </DropdownMenuItem>
                            {cls.status === 'ACTIVE' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                  onClick={() => setDeactivateId(cls.id)}
                                >
                                  Deactivate
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Level badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="outline" className={cn('text-[10px] px-2 py-0 font-medium', levelBadge)}>
                          {levelLabel}
                        </Badge>
                        {group.classes.length > 1 ? (
                          <Select
                            value={cls.id}
                            onValueChange={(value) => setSelectedClassByGroup(current => ({ ...current, [group.key]: value }))}
                          >
                            <SelectTrigger
                              className="h-7 w-28 text-xs bg-white dark:bg-slate-900"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {group.classes.map(streamClass => (
                                <SelectItem key={streamClass.id} value={streamClass.id}>
                                  {getStreamLabel(streamClass)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 font-medium">
                            {getStreamLabel(cls)}
                          </Badge>
                        )}
                      </div>

                      {/* Capacity bar */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Students</span>
                          <span className={cn('text-xs font-semibold tabular-nums', getCapacityColor(cls.studentCount, capacity))}>
                            {cls.studentCount}/{capacity}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(capacityPct, 100)}
                          className={cn('h-1.5', getProgressColor(cls.studentCount, capacity))}
                        />
                      </div>

                      {/* Teacher & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <UsersRound className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {cls.teacherId ? 'Assigned' : 'Unassigned'}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0 font-medium', sConfig.className)}
                        >
                          {sConfig.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ==================== Add/Edit Dialog ==================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                placeholder="e.g., Grade 1 A"
                value={formData.name}
                onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={formData.level} onValueChange={(v) => setFormData(d => ({ ...d, level: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(l => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stream</Label>
                <Select value={formData.stream} onValueChange={(v) => setFormData(d => ({ ...d, stream: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STREAM_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-capacity">Capacity</Label>
              <Input
                id="class-capacity"
                type="number"
                min={1}
                max={100}
                value={formData.capacity}
                onChange={(e) => setFormData(d => ({ ...d, capacity: parseInt(e.target.value) || 40 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Teacher</Label>
              <Select value={formData.teacherId} onValueChange={(v) => setFormData(d => ({ ...d, teacherId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editClass && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(d => ({ ...d, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSubmit}
              disabled={formLoading}
            >
              {formLoading ? 'Saving...' : editClass ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== View Students Dialog ==================== */}
      <Dialog open={viewStudentsOpen} onOpenChange={setViewStudentsOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              {selectedClass?.name} — Students
              <Badge variant="secondary" className="ml-2 text-xs">{studentTotal}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {studentsLoading ? (
              <div className="space-y-2 py-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : classStudents.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No students in this class</p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Adm #</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Gender</TableHead>
                        <TableHead className="text-xs">Guardian</TableHead>
                        <TableHead className="text-xs">Fees</TableHead>
                        <TableHead className="text-xs">Transport</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((s, i) => {
                        const guardian = s.guardians?.[0]?.guardian
                        const feeStatus = s.feeInfo?.status || 'UNKNOWN'
                        const feeBalance = s.feeInfo?.balance || 0
                        const transportStatus = s.transportInfo?.status || (s.studentType === 'BOARDING' ? 'BOARDING' : 'UNSET')

                        return (
                          <TableRow
                            key={s.id}
                            className="cursor-pointer"
                            onClick={() => navigateTo('student-detail', { studentId: s.id })}
                          >
                            <TableCell className="text-xs font-mono text-slate-400">
                              {(studentPage - 1) * studentLimit + i + 1}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {s.admissionNumber}
                            </TableCell>
                            <TableCell className="text-sm text-slate-900 dark:text-slate-100">
                              <div className="font-medium">{s.firstName} {s.lastName}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{s.studentType || 'DAY'}</div>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                'text-xs font-medium',
                                s.gender === 'MALE' ? 'text-sky-600 dark:text-sky-400' : 'text-pink-600 dark:text-pink-400'
                              )}>
                                {s.gender === 'MALE' ? 'Male' : 'Female'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                              <div className="max-w-36 truncate">{guardian?.name || 'No guardian'}</div>
                              {guardian?.phone && (
                                <div className="text-slate-400 dark:text-slate-500">{guardian.phone}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'w-fit text-[10px] px-2 py-0',
                                    feeStatus === 'PAID'
                                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800'
                                      : feeStatus === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
                                        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
                                  )}
                                >
                                  {feeStatus}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Bal: {formatCurrency(feeBalance)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                              <div>{transportStatus.replace(/_/g, ' ')}</div>
                              {s.transportInfo?.bus && (
                                <div className="text-slate-400 dark:text-slate-500">
                                  {s.transportInfo.bus.busNumber} - {s.transportInfo.bus.routeName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                {s.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          {/* Student Pagination */}
          {studentTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {studentPage} of {studentTotalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={studentPage <= 1} onClick={() => setStudentPage(p => p - 1)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={studentPage >= studentTotalPages} onClick={() => setStudentPage(p => p + 1)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Assign Teacher Dialog ==================== */}
      <Dialog open={assignTeacherOpen} onOpenChange={setAssignTeacherOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTeacherOpen(false)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleAssignTeacher}
              disabled={assignLoading}
            >
              {assignLoading ? 'Assigning...' : 'Assign Teacher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Deactivate Confirmation ==================== */}
      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this class? It will be marked as inactive but no data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
