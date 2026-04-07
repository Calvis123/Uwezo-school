'use client'

import { useEffect, useState, useCallback } from 'react'
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
import { useAppStore } from '@/lib/store'
import { usersApi } from '@/lib/api'
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
  phone: string
  role: string
  gender: string
  status: string
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'TEACHER',
  gender: '',
  status: 'ACTIVE',
}

const roleConfig: Record<string, { className: string; label: string; icon: typeof Users; borderColor: string; gradientFrom: string; gradientTo: string; darkBorder: string }> = {
  SUPER_ADMIN: { className: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800', label: 'Super Admin', icon: ShieldCheck, borderColor: 'border-l-red-500', gradientFrom: 'from-red-500', gradientTo: 'to-rose-500', darkBorder: 'dark:border-l-red-500' },
  ADMIN: { className: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800', label: 'Admin', icon: UserCog, borderColor: 'border-l-orange-500', gradientFrom: 'from-orange-500', gradientTo: 'to-amber-500', darkBorder: 'dark:border-l-orange-500' },
  TEACHER: { className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800', label: 'Teacher', icon: GraduationCap, borderColor: 'border-l-sky-500', gradientFrom: 'from-sky-500', gradientTo: 'to-blue-500', darkBorder: 'dark:border-l-sky-500' },
  PARENT: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Parent', icon: UserCheck, borderColor: 'border-l-green-500', gradientFrom: 'from-green-500', gradientTo: 'to-emerald-500', darkBorder: 'dark:border-l-green-500' },
}

const statusConfig: Record<string, { className: string; label: string }> = {
  ACTIVE: { className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800', label: 'Active' },
  INACTIVE: { className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600', label: 'Inactive' },
}

// Validation
function validateForm(data: UserFormData, isEdit: boolean): string | null {
  if (!data.name.trim()) return 'Name is required'
  if (!data.email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Invalid email format'
  if (!isEdit && !data.password.trim()) return 'Password is required'
  if (!isEdit && data.password.length < 6) return 'Password must be at least 6 characters'
  if (!data.role) return 'Role is required'
  return null
}

export function UserManagement() {
  const { user: currentUser } = useAppStore()
  const [users, setUsers] = useState<UserRow[]>([])
  const [counts, setCounts] = useState<UserCounts>({ total: 0, active: 0, staff: 0, teachers: 0, byRole: {} })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [viewUser, setViewUser] = useState<UserRow | null>(null)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState<UserFormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toggleId, setToggleId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / limit)
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN'

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await usersApi.list({
        page,
        limit,
        role: filterRole,
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

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openCreateForm = () => {
    setEditUser(null)
    setFormData(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditForm = (user: UserRow) => {
    setEditUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
      gender: user.gender || '',
      status: user.status,
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
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
        loadUsers()
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
    try {
      const result = await usersApi.delete(deleteId)
      if (result.success) {
        toast.success('User deactivated successfully')
        loadUsers()
      } else {
        toast.error(result.error || 'Failed to deactivate user')
      }
    } catch {
      toast.error('An error occurred')
    }
    setDeleteId(null)
  }

  const handleToggleStatus = async () => {
    if (!toggleId) return
    const targetUser = users.find((u) => u.id === toggleId)
    if (!targetUser) return

    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const result = await usersApi.update(toggleId, { status: newStatus })
      if (result.success) {
        toast.success(`User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`)
        loadUsers()
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
    TEACHER: 'Teacher',
    PARENT: 'Parent',
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
              {total} users found
              {filterRole && <span className="text-teal-600 ml-1">({roleLabels[filterRole] || filterRole})</span>}
              {filterStatus && <span className="text-slate-500 ml-1">· {statusConfig[filterStatus]?.label || filterStatus}</span>}
            </p>
          </div>
        </div>
        {isAdmin && (
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
            <SelectItem value="TEACHER">Teacher</SelectItem>
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

      {/* Users Table */}
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
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <UserCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No users found</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => {
                  const rCfg = roleConfig[user.role] || roleConfig.TEACHER
                  const sCfg = statusConfig[user.status] || statusConfig.ACTIVE
                  const RoleIcon = rCfg.icon
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
                                user.role === 'TEACHER' ? 'text-sky-700 dark:text-sky-400' :
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.status === 'ACTIVE'}
                            onCheckedChange={() => setToggleId(user.id)}
                            disabled={!isAdmin}
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
                            {isAdmin && (
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
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteId(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {editUser
                ? 'Update user information. Leave password blank to keep current.'
                : 'Fill in the details to create a new user account.'}
            </DialogDescription>
          </DialogHeader>

          {formErrors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {formErrors.general}
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                placeholder="e.g. John Kamau"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={formErrors.name ? 'border-red-300' : ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-email">Email Address</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="e.g. john@olives.co.ke"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className={formErrors.email ? 'border-red-300' : ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-password">
                Password {editUser && <span className="text-slate-400 font-normal">(leave blank to keep current)</span>}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editUser ? '••••••••' : 'Minimum 6 characters'}
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                className={formErrors.password ? 'border-red-300' : ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-phone">Phone Number</Label>
              <Input
                id="user-phone"
                placeholder="e.g. +254 712 345 678"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="user-role">Role</Label>
                <Select value={formData.role} onValueChange={(v) => handleFormChange('role', v)}>
                  <SelectTrigger id="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => handleFormChange('gender', v)}>
                  <SelectTrigger id="user-gender">
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

            {editUser && (
              <div className="grid gap-2">
                <Label htmlFor="user-status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleFormChange('status', v)}>
                  <SelectTrigger id="user-status">
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setEditUser(null); setFormErrors({}) }}
            >
              Cancel
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
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
                        viewUser.role === 'TEACHER' ? 'text-sky-700 dark:text-sky-400' :
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
              {isAdmin && (
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
              {users.find((u) => u.id === toggleId)?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {users.find((u) => u.id === toggleId)?.status === 'ACTIVE'
                ? 'Are you sure you want to deactivate this user? They will no longer be able to log in.'
                : 'Are you sure you want to activate this user? They will be able to log in again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                users.find((u) => u.id === toggleId)?.status === 'ACTIVE'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }
            >
              {users.find((u) => u.id === toggleId)?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this user? This will set their status to inactive and they will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
