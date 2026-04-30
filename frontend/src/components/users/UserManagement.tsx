'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
  GraduationCap,
  UserCog,
  UserCheck,
  XCircle,
  Mail,
  Phone,
  Calendar,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { ClassItem, useAppStore } from '@/lib/store'
import { refApi, usersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  gender: string | null
  createdAt: string
  updatedAt: string
  _count?: { students: number }
  assignedClasses?: { id: string; name: string; stream: string | null }[]
}

interface UserCounts {
  total: number
  active: number
  staff: number
  teachers: number
  byRole: Record<string, number>
}

interface UserFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  role: string
  gender: string
  status: string
  assignedClassId: string
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  role: 'TEACHER',
  gender: '',
  status: 'ACTIVE',
  assignedClassId: '',
}

const roleConfig: Record<string, { className: string; label: string; icon: typeof Users; borderColor: string; gradientFrom: string; gradientTo: string; darkBorder: string }> = {
  SUPER_ADMIN: { className: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', label: 'Super Admin', icon: ShieldCheck, borderColor: 'border-l-red-500', gradientFrom: 'from-red-500', gradientTo: 'to-rose-500', darkBorder: 'dark:border-l-red-500' },
  ADMIN: { className: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', label: 'Admin', icon: UserCog, borderColor: 'border-l-orange-500', gradientFrom: 'from-orange-500', gradientTo: 'to-amber-500', darkBorder: 'dark:border-l-orange-500' },
  HEADTEACHER: { className: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800', label: 'Headteacher', icon: ShieldCheck, borderColor: 'border-l-violet-500', gradientFrom: 'from-violet-500', gradientTo: 'to-purple-500', darkBorder: 'dark:border-l-violet-500' },
  DOS: { className: 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800', label: 'DOS', icon: GraduationCap, borderColor: 'border-l-indigo-500', gradientFrom: 'from-indigo-500', gradientTo: 'to-sky-500', darkBorder: 'dark:border-l-indigo-500' },
  TEACHER: { className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Teacher', icon: GraduationCap, borderColor: 'border-l-sky-500', gradientFrom: 'from-sky-500', gradientTo: 'to-blue-500', darkBorder: 'dark:border-l-sky-500' },
  SECRETARY: { className: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800', label: 'Secretary', icon: UserCog, borderColor: 'border-l-cyan-500', gradientFrom: 'from-cyan-500', gradientTo: 'to-teal-500', darkBorder: 'dark:border-l-cyan-500' },
  BURSAR: { className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800', label: 'Bursar', icon: UserCheck, borderColor: 'border-l-emerald-500', gradientFrom: 'from-emerald-500', gradientTo: 'to-green-500', darkBorder: 'dark:border-l-emerald-500' },
  PARENT: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Parent', icon: UserCheck, borderColor: 'border-l-green-500', gradientFrom: 'from-green-500', gradientTo: 'to-emerald-500', darkBorder: 'dark:border-l-green-500' },
}

const statusConfig: Record<string, { className: string; label: string }> = {
  ACTIVE: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Active' },
  INACTIVE: { className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600', label: 'Inactive' },
}

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HEADTEACHER', label: 'Headteacher' },
  { value: 'DOS', label: 'DOS' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'SECRETARY', label: 'Secretary' },
  { value: 'BURSAR', label: 'Bursar' },
  { value: 'PARENT', label: 'Parent' },
]

const headteacherManageableRoles = ['TEACHER', 'DOS', 'SECRETARY', 'BURSAR']

function getClassLabel(cls: Pick<ClassItem, 'name' | 'stream'>) {
  return `${cls.name}${cls.stream ? ` ${cls.stream}` : ''}`
}

function sortClassesByNameAndStream(items: ClassItem[]) {
  return [...items].sort((a, b) => {
    const nameDiff = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    if (nameDiff !== 0) return nameDiff
    return (a.stream || '').localeCompare(b.stream || '', undefined, { numeric: true, sensitivity: 'base' })
  })
}

// Validation
function validateForm(data: UserFormData, isEdit: boolean): string | null {
  if (!data.name.trim()) return 'Name is required'
  if (!data.email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    return 'Invalid email format. Use format like name@example.com'
  }
  if (!isEdit && !data.password.trim()) return 'Password is required'
  if (!isEdit && data.password.length < 6) return 'Password must be at least 6 characters'
  if (!isEdit && data.password !== data.confirmPassword) return 'Passwords do not match'
  if (isEdit && data.password && data.password.length < 6) return 'Password must be at least 6 characters'
  if (isEdit && data.password && data.password !== data.confirmPassword) return 'Passwords do not match'
  if (!data.role) return 'Role is required'
  if (data.role === 'TEACHER' && !data.assignedClassId) return 'Please assign the teacher to a class'
  return null
}

export function UserManagement() {
  const { user: currentUser } = useAppStore()
  const [users, setUsers] = useState<UserRow[]>([])
  const [parentUsers, setParentUsers] = useState<UserRow[]>([])
  const [counts, setCounts] = useState<UserCounts>({ total: 0, active: 0, staff: 0, teachers: 0, byRole: {} })
  const [total, setTotal] = useState(0)
  const [parentTotal, setParentTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [parentLoading, setParentLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [viewUser, setViewUser] = useState<UserRow | null>(null)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState<UserFormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toggleId, setToggleId] = useState<string | null>(null)
  const [classOptions, setClassOptions] = useState<ClassItem[]>([])

  const totalPages = Math.ceil(total / limit)
  const canCreateDelete = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN'
  const canManage = canCreateDelete || currentUser?.role === 'HEADTEACHER'
  const canCreateUser = canManage
  const creatableRoleOptions = currentUser?.role === 'HEADTEACHER'
    ? roleOptions.filter((r) => ['TEACHER', 'DOS', 'SECRETARY', 'BURSAR'].includes(r.value))
    : roleOptions
  const teacherAssignableClasses = useMemo(() => {
    const currentAssignedId = editUser?.assignedClasses?.[0]?.id || ''
    return sortClassesByNameAndStream(
      classOptions.filter((cls) => !cls.teacherId || cls.teacherId === editUser?.id || cls.id === currentAssignedId)
    )
  }, [classOptions, editUser])

  const loadUsers = useCallback(async () => {
    if (filterRole === 'PARENT') {
      setUsers([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await usersApi.list({
        page,
        limit,
        role: filterRole || undefined,
        excludeRole: !filterRole ? 'PARENT' : undefined,
        status: filterStatus,
        search,
      })
      if (result.success && result.data) {
        setUsers(result.data.items || [])
        setTotal(result.data.total || 0)
        if (result.data.counts) {
          setCounts(result.data.counts)
        }
      } else {
        toast.error(result.error || 'Failed to load users')
      }
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, limit, filterRole, filterStatus, search])

  const loadParentUsers = useCallback(async () => {
    if (filterRole && filterRole !== 'PARENT') {
      setParentUsers([])
      setParentTotal(0)
      setParentLoading(false)
      return
    }

    setParentLoading(true)
    try {
      const result = await usersApi.list({
        page: 1,
        limit: 500,
        role: 'PARENT',
        status: filterStatus,
        search,
      })
      if (result.success && result.data) {
        setParentUsers(result.data.items || [])
        setParentTotal(result.data.total || 0)
      } else {
        toast.error(result.error || 'Failed to load parents')
      }
    } catch {
      toast.error('Failed to load parents')
    } finally {
      setParentLoading(false)
    }
  }, [filterRole, filterStatus, search])

  const canManageTargetUser = useCallback((target: UserRow | null | undefined) => {
    if (!target || !currentUser) return false
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') return true
    if (currentUser.role === 'HEADTEACHER') return headteacherManageableRoles.includes(target.role)
    return false
  }, [currentUser])

  const refreshAllUsers = useCallback(() => {
    loadUsers()
    loadParentUsers()
  }, [loadUsers, loadParentUsers])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadParentUsers()
  }, [loadParentUsers])

  useEffect(() => {
    const loadClasses = async () => {
      const res = await refApi.classes()
      if (res.success && res.data) {
        setClassOptions(res.data)
      }
    }
    loadClasses()
  }, [])

  const openCreateForm = () => {
    setEditUser(null)
    setFormData({ ...emptyForm })
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditForm = (user: UserRow) => {
    if (!canManageTargetUser(user)) {
      toast.error('You are not allowed to edit this user')
      return
    }
    setEditUser(user)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      phone: user.phone || '',
      role: user.role || 'TEACHER',
      gender: user.gender || '',
      status: user.status || 'ACTIVE',
      assignedClassId: user.assignedClasses?.[0]?.id || '',
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'role' && value !== 'TEACHER') {
        next.assignedClassId = ''
      }
      if (field === 'password' && !value) {
        next.confirmPassword = ''
      }
      return next
    })
    if (formErrors[field] || formErrors.general) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        delete next.general
        return next
      })
    }
  }

  const handleSubmit = async () => {
    const isEdit = !!editUser
    const error = validateForm(formData, isEdit)
    if (error) {
      setFormErrors({ general: error })
      return
    }

    setFormSubmitting(true)
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        gender: formData.gender || null,
        status: formData.status,
        assignedClassId: formData.role === 'TEACHER' ? formData.assignedClassId : null,
      }
      if (!isEdit) {
        payload.password = formData.password
      } else if (formData.password) {
        payload.password = formData.password
      }

      const result = isEdit
        ? await usersApi.update(editUser!.id, payload)
        : await usersApi.create(payload)

      if (result.success) {
        toast.success(isEdit ? 'User updated successfully' : 'User created successfully')
        setFormOpen(false)
        refreshAllUsers()
      } else {
        toast.error(result.error || (isEdit ? 'Failed to update user' : 'Failed to create user'))
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const targetUser = allUsersForActions.find((u) => u.id === deleteId)
    if (!canManageTargetUser(targetUser)) {
      toast.error('You are not allowed to delete this user')
      setDeleteId(null)
      return
    }
    try {
      const result = await usersApi.delete(deleteId, { permanent: true })
      if (result.success) {
        toast.success('User deleted successfully')
        refreshAllUsers()
      } else {
        toast.error(result.error || 'Failed to delete user')
      }
    } catch {
      toast.error('An error occurred')
    }
    setDeleteId(null)
  }

  const handleToggleStatus = async () => {
    if (!toggleId) return
    const targetUser = allUsersForActions.find((u) => u.id === toggleId)
    if (!targetUser) return
    if (!canManageTargetUser(targetUser)) {
      toast.error('You are not allowed to update this user status')
      setToggleId(null)
      return
    }

    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const result = await usersApi.update(toggleId, { status: newStatus })
      if (result.success) {
        toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`)
        refreshAllUsers()
      } else {
        toast.error(result.error || 'Failed to update user status')
      }
    } catch {
      toast.error('An error occurred')
    }
    setToggleId(null)
  }

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    HEADTEACHER: 'Headteacher',
    DOS: 'DOS',
    TEACHER: 'Teacher',
    SECRETARY: 'Secretary',
    BURSAR: 'Bursar',
    PARENT: 'Parent',
  }

  const allUsersForActions = [...users, ...parentUsers]
  const totalVisibleUsers = total + parentTotal
  const teacherUsers = users.filter((item) => item.role === 'TEACHER')
  const otherSchoolUsers = users.filter((item) => item.role !== 'TEACHER')
  const showTeachersSection = filterRole !== 'PARENT' && (!filterRole || filterRole === 'TEACHER')
  const showOtherSchoolUsersSection = filterRole !== 'PARENT' && filterRole !== 'TEACHER'

  const renderSchoolUserRows = (items: UserRow[], emptyMessage: string, showAssignedClass: boolean) => {
    if (loading) {
      return [...Array(6)].map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          {showAssignedClass && <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>}
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
      ))
    }

    if (items.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={showAssignedClass ? 7 : 6} className="text-center py-12">
            <UserCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{emptyMessage}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
          </TableCell>
        </TableRow>
      )
    }

    return items.map((user, index) => {
      const rCfg = roleConfig[user.role] || roleConfig.TEACHER
      const RoleIcon = rCfg.icon
      const canManageThisUser = canManageTargetUser(user)
      return (
        <motion.tr
          key={user.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.03 }}
          className={cn(
            'hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all duration-200 border-l-2 border-l-transparent',
            rCfg.borderColor, rCfg.darkBorder,
            user.status === 'INACTIVE' && 'opacity-60',
          )}
        >
          <TableCell>
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'h-9 w-9 rounded-full bg-gradient-to-br p-[2px]',
                rCfg.gradientFrom, rCfg.gradientTo,
              )}>
                <Avatar className="h-full w-full rounded-full">
                  <AvatarFallback className={cn(
                    'text-xs font-semibold bg-white dark:bg-slate-800',
                    user.role === 'SUPER_ADMIN' ? 'text-red-700 dark:text-red-400' :
                    user.role === 'ADMIN' ? 'text-orange-700 dark:text-orange-400' :
                    user.role === 'HEADTEACHER' ? 'text-violet-700 dark:text-violet-400' :
                    user.role === 'DOS' ? 'text-indigo-700 dark:text-indigo-400' :
                    user.role === 'TEACHER' ? 'text-sky-700 dark:text-sky-400' :
                    user.role === 'SECRETARY' ? 'text-cyan-700 dark:text-cyan-400' :
                    user.role === 'BURSAR' ? 'text-emerald-700 dark:text-emerald-400' :
                    'text-green-700 dark:text-green-400'
                  )}>
                    {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{user.email}</p>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell text-sm text-slate-600 dark:text-slate-300">
            {user.email}
          </TableCell>
          <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
            {user.phone || '—'}
          </TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={cn('text-[10px] px-2 py-0.5 font-medium gap-1', rCfg.className)}
            >
              <RoleIcon className="w-3 h-3" />
              {rCfg.label}
            </Badge>
          </TableCell>
          {showAssignedClass && (
            <TableCell className="hidden lg:table-cell">
              {user.assignedClasses?.length ? (
                <Badge variant="secondary" className="text-[10px]">
                  {user.assignedClasses[0].name}
                  {user.assignedClasses[0].stream ? ` ${user.assignedClasses[0].stream}` : ''}
                </Badge>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400">Unassigned</span>
              )}
            </TableCell>
          )}
          <TableCell>
            <div className="flex items-center gap-2">
              <Switch
                checked={user.status === 'ACTIVE'}
                onCheckedChange={() => setToggleId(user.id)}
                disabled={!canManageThisUser}
                className="data-[state=checked]:bg-teal-600"
              />
            </div>
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewUser(user)}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </DropdownMenuItem>
                {canManageThisUser && (
                  <>
                    <DropdownMenuItem onClick={() => openEditForm(user)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setToggleId(user.id)}
                      className={user.status === 'ACTIVE' ? 'text-amber-600 focus:text-amber-600' : 'text-green-600 focus:text-green-600'}
                    >
                      {user.status === 'ACTIVE' ? (
                        <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                      ) : (
                        <><UserCheck className="w-4 h-4 mr-2" /> Activate</>
                      )}
                    </DropdownMenuItem>
                    {canCreateDelete && (
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteId(user.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </motion.tr>
      )
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              User Management
              <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs font-semibold">
                {counts.total}
              </Badge>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalVisibleUsers} users found
              {filterRole && <span className="text-teal-600 ml-1">({roleLabels[filterRole] || filterRole})</span>}
              {filterStatus && <span className="text-slate-500 ml-1">· {statusConfig[filterStatus]?.label || filterStatus}</span>}
            </p>
          </div>
        </div>
        {canCreateUser && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            onClick={openCreateForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} whileHover={{ y: -2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-teal-50/80 to-white dark:from-teal-900/20 dark:to-slate-800 hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Users</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{counts.total}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-green-50/80 to-white dark:from-green-900/20 dark:to-slate-800 hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Active Users</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400 tabular-nums">{counts.active}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} whileHover={{ y: -2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-900/20 dark:to-slate-800 hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Staff / Admin</p>
                  <p className="text-sm font-bold text-orange-700 dark:text-orange-400 tabular-nums">{counts.staff}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} whileHover={{ y: -2 }}>
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-900/20 dark:to-slate-800 hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Teachers</p>
                  <p className="text-sm font-bold text-sky-700 dark:text-sky-400 tabular-nums">{counts.teachers}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Search by name, email, or role..."
            className="pl-9 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterRole} onValueChange={(v) => { setFilterRole(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40 h-10">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="HEADTEACHER">Headteacher</SelectItem>
            <SelectItem value="DOS">DOS</SelectItem>
            <SelectItem value="TEACHER">Teacher</SelectItem>
            <SelectItem value="SECRETARY">Secretary</SelectItem>
            <SelectItem value="BURSAR">Bursar</SelectItem>
            <SelectItem value="PARENT">Parent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-36 h-10">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showOtherSchoolUsersSection && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">School Users</h3>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {loading ? Math.max(total - counts.teachers, 0) : otherSchoolUsers.length}
            </Badge>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden shadow-sm"
          >
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 sticky top-0 z-10">
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSchoolUserRows(otherSchoolUsers, 'No school users found', false)}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </>
      )}

      {showTeachersSection && (
        <>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Teachers</h3>
        <Badge variant="secondary" className="bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800">
          {loading ? counts.teachers : teacherUsers.length}
        </Badge>
      </div>

      {/* Teachers Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden shadow-sm"
      >
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 sticky top-0 z-10">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Role</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Assigned Class</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : teacherUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <UserCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No teachers found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                teacherUsers.map((user, index) => {
                  const rCfg = roleConfig[user.role] || roleConfig.TEACHER
                  const sCfg = statusConfig[user.status] || statusConfig.ACTIVE
                  const RoleIcon = rCfg.icon
                  const canManageThisUser = canManageTargetUser(user)
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className={cn(
                        'hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-all duration-200 border-l-2 border-l-transparent',
                        rCfg.borderColor, rCfg.darkBorder,
                        user.status === 'INACTIVE' && 'opacity-60',
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'h-9 w-9 rounded-full bg-gradient-to-br p-[2px]',
                            rCfg.gradientFrom, rCfg.gradientTo,
                          )}>
                            <Avatar className="h-full w-full rounded-full">
                              <AvatarFallback className={cn(
                                'text-xs font-semibold bg-white dark:bg-slate-800',
                                user.role === 'SUPER_ADMIN' ? 'text-red-700 dark:text-red-400' :
                                user.role === 'ADMIN' ? 'text-orange-700 dark:text-orange-400' :
                                user.role === 'HEADTEACHER' ? 'text-violet-700 dark:text-violet-400' :
                                user.role === 'DOS' ? 'text-indigo-700 dark:text-indigo-400' :
                                user.role === 'TEACHER' ? 'text-sky-700 dark:text-sky-400' :
                                user.role === 'SECRETARY' ? 'text-cyan-700 dark:text-cyan-400' :
                                user.role === 'BURSAR' ? 'text-emerald-700 dark:text-emerald-400' :
                                'text-green-700 dark:text-green-400'
                              )}>
                                {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600 dark:text-slate-300">
                        {user.email}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">
                        {user.phone || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5 font-medium gap-1', rCfg.className)}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {rCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.role === 'TEACHER' ? (
                          user.assignedClasses?.length ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {user.assignedClasses[0].name}
                              {user.assignedClasses[0].stream ? ` ${user.assignedClasses[0].stream}` : ''}
                            </Badge>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Unassigned</span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.status === 'ACTIVE'}
                            onCheckedChange={() => setToggleId(user.id)}
                            disabled={!canManageThisUser}
                            className="data-[state=checked]:bg-teal-600"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewUser(user)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {canManageThisUser && (
                              <>
                                <DropdownMenuItem onClick={() => openEditForm(user)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setToggleId(user.id)}
                                  className={user.status === 'ACTIVE' ? 'text-amber-600 focus:text-amber-600' : 'text-green-600 focus:text-green-600'}
                                >
                                  {user.status === 'ACTIVE' ? (
                                    <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                                  ) : (
                                    <><UserCheck className="w-4 h-4 mr-2" /> Activate</>
                                  )}
                                </DropdownMenuItem>
                                {canCreateDelete && (
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteId(user.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
        </>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Parents</h3>
        <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
          {parentTotal}
        </Badge>
      </div>

      {/* Parents Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden shadow-sm"
      >
        <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50/50 dark:hover:bg-green-900/10 sticky top-0 z-10">
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Parent Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Email</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Linked Students</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : parentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <UserCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No parents found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Parents linked to students will appear here</p>
                  </TableCell>
                </TableRow>
              ) : (
                parentUsers.map((parent, index) => {
                  const sCfg = statusConfig[parent.status] || statusConfig.ACTIVE
                  const canManageThisParent = canManageTargetUser(parent)
                  return (
                    <motion.tr
                      key={parent.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className={cn(
                        'hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-all duration-200 border-l-2 border-l-green-500',
                        parent.status === 'INACTIVE' && 'opacity-60',
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 p-[2px]">
                            <Avatar className="h-full w-full rounded-full">
                              <AvatarFallback className="text-xs font-semibold bg-white dark:bg-slate-800 text-green-700 dark:text-green-400">
                                {parent.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'P'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{parent.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">{parent.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600 dark:text-slate-300">{parent.email}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500 dark:text-slate-400">{parent.phone || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary" className="text-[10px]">
                          {parent._count?.students || 0} student{parent._count?.students !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-2 py-0.5 font-medium', sCfg.className)}
                        >
                          {sCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-700">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewUser(parent)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {canManageThisParent && (
                              <>
                                <DropdownMenuItem onClick={() => openEditForm(parent)}>
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setToggleId(parent.id)}
                                  className={parent.status === 'ACTIVE' ? 'text-amber-600 focus:text-amber-600' : 'text-green-600 focus:text-green-600'}
                                >
                                  {parent.status === 'ACTIVE' ? (
                                    <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                                  ) : (
                                    <><UserCheck className="w-4 h-4 mr-2" /> Activate</>
                                  )}
                                </DropdownMenuItem>
                                {canCreateDelete && (
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteId(parent.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

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

      {/* Add/Edit User Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditUser(null); setFormErrors({}) } }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription className="text-sm">
              {editUser
                ? 'Update user information. Leave password blank to keep current.'
                : 'Fill in the details to create a new user account.'}
            </DialogDescription>
          </DialogHeader>

          {formErrors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {formErrors.general}
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                placeholder="e.g. John Kamau"
                value={formData.name || ''}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={cn('h-11', formErrors.name && 'border-red-300')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="e.g. john@uwezoschool.co.ke"
                value={formData.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className={cn('h-11', formErrors.email && 'border-red-300')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password {editUser && <span className="font-normal text-slate-400">(optional)</span>}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editUser ? 'New password' : 'Minimum 6 characters'}
                value={formData.password || ''}
                onChange={(e) => handleFormChange('password', e.target.value)}
                className={cn('h-11', formErrors.password && 'border-red-300')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-confirm-password">Confirm Password</Label>
              <Input
                id="user-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword || ''}
                onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                disabled={Boolean(editUser && !formData.password)}
                className={cn('h-11', formErrors.confirmPassword && 'border-red-300')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input
                id="user-phone"
                placeholder="e.g. +254 712 345 678"
                value={formData.phone || ''}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="user-role">Role</Label>
                <Select value={formData.role || 'TEACHER'} onValueChange={(v) => handleFormChange('role', v)}>
                  <SelectTrigger id="user-role" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creatableRoleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-gender">Gender</Label>
                <Select value={formData.gender || ''} onValueChange={(v) => handleFormChange('gender', v)}>
                  <SelectTrigger id="user-gender" className="h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.role === 'TEACHER' && (
              <div className="grid gap-2">
                <Label htmlFor="assigned-class">Assigned Class</Label>
                <Select
                  value={formData.assignedClassId || ''}
                  onValueChange={(v) => handleFormChange('assignedClassId', v)}
                >
                  <SelectTrigger id="assigned-class" className="h-11">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherAssignableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {getClassLabel(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teacherAssignableClasses.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    No unassigned classes are available. Free a class by editing its current teacher first.
                  </p>
                )}
              </div>
            )}

            {editUser && (
              <div className="grid gap-2">
                <Label htmlFor="user-status">Status</Label>
                <Select value={formData.status || 'ACTIVE'} onValueChange={(v) => handleFormChange('status', v)}>
                  <SelectTrigger id="user-status" className="h-11">
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

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => { setFormOpen(false); setEditUser(null); setFormErrors({}) }}
            >
              Cancel
            </Button>
            <Button
              className="h-11 bg-teal-600 px-6 text-white hover:bg-teal-700"
              onClick={handleSubmit}
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(open) => { if (!open) setViewUser(null) }}>
        <DialogContent className="sm:max-w-md">
          {viewUser && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'h-14 w-14 rounded-full bg-gradient-to-br p-[2px]',
                    (roleConfig[viewUser.role] || roleConfig.TEACHER).gradientFrom,
                    (roleConfig[viewUser.role] || roleConfig.TEACHER).gradientTo,
                  )}>
                    <Avatar className="h-full w-full rounded-full">
                      <AvatarFallback className={cn(
                        'text-lg font-semibold bg-white dark:bg-slate-800',
                        viewUser.role === 'SUPER_ADMIN' ? 'text-red-700 dark:text-red-400' :
                        viewUser.role === 'ADMIN' ? 'text-orange-700 dark:text-orange-400' :
                        viewUser.role === 'HEADTEACHER' ? 'text-violet-700 dark:text-violet-400' :
                        viewUser.role === 'DOS' ? 'text-indigo-700 dark:text-indigo-400' :
                        viewUser.role === 'TEACHER' ? 'text-sky-700 dark:text-sky-400' :
                        viewUser.role === 'SECRETARY' ? 'text-cyan-700 dark:text-cyan-400' :
                        viewUser.role === 'BURSAR' ? 'text-emerald-700 dark:text-emerald-400' :
                        'text-green-700 dark:text-green-400'
                      )}>
                        {viewUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{viewUser.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-2 py-0.5 font-medium', roleConfig[viewUser.role]?.className)}
                      >
                        {roleConfig[viewUser.role]?.label || viewUser.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-2 py-0.5 font-medium', statusConfig[viewUser.status]?.className)}
                      >
                        {statusConfig[viewUser.status]?.label || viewUser.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Email</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{viewUser.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Phone</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{viewUser.phone || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Gender</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{viewUser.gender || 'Not set'}</span>
                  </div>
                  {viewUser.role === 'TEACHER' && (
                    <div className="flex items-center gap-3 text-sm">
                      <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Class</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">
                        {viewUser.assignedClasses?.[0]
                          ? `${viewUser.assignedClasses[0].name}${viewUser.assignedClasses[0].stream ? ` ${viewUser.assignedClasses[0].stream}` : ''}`
                          : 'Unassigned'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Joined</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {viewUser.createdAt ? format(new Date(viewUser.createdAt), 'MMM d, yyyy') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <UserCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 min-w-[56px]">Linked</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">
                      {viewUser._count?.students || 0} student{viewUser._count?.students !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              {canManageTargetUser(viewUser) && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => { setViewUser(null); openEditForm(viewUser) }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setViewUser(null); setToggleId(viewUser.id) }}
                    className={viewUser.status === 'ACTIVE' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                  >
                    {viewUser.status === 'ACTIVE' ? (
                      <><XCircle className="w-4 h-4 mr-2" /> Deactivate</>
                    ) : (
                      <><UserCheck className="w-4 h-4 mr-2" /> Activate</>
                    )}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirmation */}
      <AlertDialog open={!!toggleId} onOpenChange={() => setToggleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {allUsersForActions.find((u) => u.id === toggleId)?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {allUsersForActions.find((u) => u.id === toggleId)?.status === 'ACTIVE'
                ? 'Are you sure you want to deactivate this user? They will no longer be able to log in.'
                : 'Are you sure you want to activate this user? They will be able to log in again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                allUsersForActions.find((u) => u.id === toggleId)?.status === 'ACTIVE'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {allUsersForActions.find((u) => u.id === toggleId)?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the user account from the system. Teacher class assignments, guardian links, and messages involving this user will be removed. Use Deactivate instead if you only want to block login temporarily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
