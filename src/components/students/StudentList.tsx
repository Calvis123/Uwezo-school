'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
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
        // Demo data
        const demoStudents: StudentRow[] = [
          { id: '1', admissionNumber: 'ADM-001', firstName: 'John', lastName: 'Kamau', gender: 'MALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE' },
          { id: '2', admissionNumber: 'ADM-002', firstName: 'Mary', lastName: 'Wanjiku', gender: 'FEMALE', class: { id: '2', name: 'Grade 5' }, status: 'ACTIVE' },
          { id: '3', admissionNumber: 'ADM-003', firstName: 'Peter', lastName: 'Ochieng', gender: 'MALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE' },
          { id: '4', admissionNumber: 'ADM-004', firstName: 'Grace', lastName: 'Akinyi', gender: 'FEMALE', class: { id: '3', name: 'Grade 6' }, status: 'ACTIVE' },
          { id: '5', admissionNumber: 'ADM-005', firstName: 'David', lastName: 'Mwangi', gender: 'MALE', class: { id: '2', name: 'Grade 5' }, status: 'ACTIVE' },
          { id: '6', admissionNumber: 'ADM-006', firstName: 'Sarah', lastName: 'Njeri', gender: 'FEMALE', class: { id: '4', name: 'Grade 7' }, status: 'ACTIVE' },
          { id: '7', admissionNumber: 'ADM-007', firstName: 'James', lastName: 'Otieno', gender: 'MALE', class: { id: '3', name: 'Grade 6' }, status: 'INACTIVE' },
          { id: '8', admissionNumber: 'ADM-008', firstName: 'Ann', lastName: 'Muthoni', gender: 'FEMALE', class: { id: '5', name: 'Grade 8' }, status: 'ACTIVE' },
          { id: '9', admissionNumber: 'ADM-009', firstName: 'Brian', lastName: 'Kipchoge', gender: 'MALE', class: { id: '4', name: 'Grade 7' }, status: 'ACTIVE' },
          { id: '10', admissionNumber: 'ADM-010', firstName: 'Lucy', lastName: 'Wambui', gender: 'FEMALE', class: { id: '1', name: 'Grade 4' }, status: 'ACTIVE' },
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

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-slate-100 text-slate-700',
    GRADUATED: 'bg-blue-100 text-blue-700',
    TRANSFERRED: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Students</h2>
          <p className="text-sm text-slate-500">{total} students found</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => {
            setEditStudent(null)
            setFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or admission number..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterClass} onValueChange={(v) => { setFilterClass(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40 h-10">
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
          <SelectTrigger className="w-full sm:w-36 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="GRADUATED">Graduated</SelectItem>
            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold">Admission #</TableHead>
              <TableHead className="text-xs font-semibold">Name</TableHead>
              <TableHead className="text-xs font-semibold hidden sm:table-cell">Gender</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">Class</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigateTo('student-detail', { studentId: student.id })}
                >
                  <TableCell className="text-sm font-mono text-slate-500">
                    {student.admissionNumber}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-900">
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                    {student.gender}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-slate-600">
                    {student.class?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] px-2 py-0.5', statusColors[student.status] || '')}
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteId(student.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pageNum > totalPages) return null
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className={cn('h-8 w-8', page === pageNum && 'bg-teal-600 hover:bg-teal-700')}
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
