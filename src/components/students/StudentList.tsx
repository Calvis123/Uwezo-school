'use client'

import { useEffect, useState, useCallback } from 'react'
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
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { cn } from '@/lib/utils'

interface StudentRow {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  class?: { id: string; name: string }
  status: string
  feesDue?: number
}

export function StudentList() {
  const { navigateTo, classes, setClasses } = useAppStore()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<any | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [localClasses, setLocalClasses] = useState(classes)

  const totalPages = Math.ceil(total / limit)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const result = await studentsApi.list({
        page,
        limit,
        classId: filterClass,
        status: filterStatus,
        search,
      })
      if (result.success && result.data) {
        setStudents(result.data.items || [])
        setTotal(result.data.total || 0)
      } else {
        const demoStudents: StudentRow[] = [
          { id: '1', admissionNumber: 'ADM-001', firstName: 'John', lastName: 'Kamau', gender: 'MALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE', feesDue: 15000 },
          { id: '2', admissionNumber: 'ADM-002', firstName: 'Mary', lastName: 'Wanjiku', gender: 'FEMALE', class: { id: '2', name: 'Grade 5' }, status: 'ACTIVE', feesDue: 0 },
          { id: '3', admissionNumber: 'ADM-003', firstName: 'Peter', lastName: 'Ochieng', gender: 'MALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE', feesDue: 25000 },
          { id: '4', admissionNumber: 'ADM-004', firstName: 'Grace', lastName: 'Akinyi', gender: 'FEMALE', class: { id: '3', name: 'Grade 6' }, status: 'ACTIVE', feesDue: 8000 },
          { id: '5', admissionNumber: 'ADM-005', firstName: 'David', lastName: 'Mwangi', gender: 'MALE', class: { id: '2', name: 'Grade 5' }, status: 'ACTIVE', feesDue: 0 },
          { id: '6', admissionNumber: 'ADM-006', firstName: 'Sarah', lastName: 'Njeri', gender: 'FEMALE', class: { id: '4', name: 'Grade 7' }, status: 'ACTIVE', feesDue: 32000 },
          { id: '7', admissionNumber: 'ADM-007', firstName: 'James', lastName: 'Otieno', gender: 'MALE', class: { id: '3', name: 'Grade 6' }, status: 'INACTIVE', feesDue: 45000 },
          { id: '8', admissionNumber: 'ADM-008', firstName: 'Ann', lastName: 'Muthoni', gender: 'FEMALE', class: { id: '5', name: 'Grade 8' }, status: 'ACTIVE', feesDue: 12000 },
          { id: '9', admissionNumber: 'ADM-009', firstName: 'Brian', lastName: 'Kipchoge', gender: 'MALE', class: { id: '4', name: 'Grade 7' }, status: 'ACTIVE', feesDue: 0 },
          { id: '10', admissionNumber: 'ADM-010', firstName: 'Lucy', lastName: 'Wambui', gender: 'FEMALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE', feesDue: 18000 },
        ]
        setStudents(demoStudents)
        setTotal(demoStudents.length)
      }
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, filterClass, filterStatus, search])

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses])

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

  const statusConfig: Record<string, { className: string; label: string }> = {
    ACTIVE: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Active' },
    INACTIVE: { className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600', label: 'Inactive' },
    GRADUATED: { className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Graduated' },
    TRANSFERRED: { className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800', label: 'Transferred' },
  }

  const pageActiveCount = students.filter(s => s.status === 'ACTIVE').length
  const pageInactiveCount = students.filter(s => s.status === 'INACTIVE').length
  const maleCount = students.filter(s => s.gender === 'MALE').length
  const femaleCount = students.filter(s => s.gender === 'FEMALE').length

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
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Students</h2>
            <Badge variant="secondary" className="bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800 tabular-nums font-semibold text-xs px-2 py-0.5">
              {total}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} students found
            {filterStatus === 'ACTIVE' && <span className="text-green-600 dark:text-green-400 ml-1">(showing active)</span>}
            {filterStatus === 'INACTIVE' && <span className="text-slate-500 ml-1">(showing inactive)</span>}
            {filterStatus === '' && <span className="text-slate-500 ml-1">(all statuses)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-slate-600 dark:text-slate-400 hidden sm:flex"
            onClick={() => toast.info('Import feature coming soon')}
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                  <span className="text-xs">♂♀</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ratio</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {students.length > 0
                      ? `${Math.round(maleCount / students.length * 100)}:${Math.round(femaleCount / students.length * 100)}`
                      : '—'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by name, admission number, or class..."
            className="pl-9 h-10 bg-white dark:bg-slate-800"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select value={filterClass} onValueChange={(v) => { setFilterClass(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {localClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {/* Bulk Actions Dropdown */}
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info('Select students first')} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
        <div className="max-h-[520px] overflow-y-auto">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <TableRow className="hover:bg-slate-50/95 dark:hover:bg-slate-800/95">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10 text-center">#</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Admission #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Gender</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Class</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Fees Due</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
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
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No students found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => {
                  const statusCfg = statusConfig[student.status] || statusConfig.ACTIVE
                  const rowNumber = (page - 1) * limit + index + 1
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
                    >
                      <TableCell className="text-xs font-mono text-slate-400 dark:text-slate-500 text-center">
                        {rowNumber}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-slate-500 dark:text-slate-400">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                            student.gender === 'MALE'
                              ? 'bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                              : 'bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400'
                          )}>
                            {student.gender === 'MALE' ? '♂' : '♀'}
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
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                        {student.class?.name || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {(student.feesDue !== undefined && student.feesDue > 0) ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-red-500" />
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
                              {student.feesDue.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">Paid</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5 font-medium', statusCfg.className)}
                        >
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100">
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
                    …
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
