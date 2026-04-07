'use client'

import { useState, useEffect } from 'react'
import {
  Bus,
  Plus,
  Users,
  Activity,
  Gauge,
  Phone,
  MapPin,
  User,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  Wrench,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { transportApi } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────

interface BusData {
  id: string
  busNumber: string
  routeName: string
  driverName: string
  driverPhone: string | null
  capacity: number
  currentStudents: number
  status: string
  color: string
  createdAt: string
  updatedAt: string
}

interface TransportStats {
  total: number
  active: number
  maintenance: number
  inactive: number
  totalCapacity: number
  totalStudents: number
}

interface FormData {
  busNumber: string
  routeName: string
  driverName: string
  driverPhone: string
  capacity: string
  currentStudents: string
  status: string
  color: string
}

const emptyForm: FormData = {
  busNumber: '',
  routeName: '',
  driverName: '',
  driverPhone: '',
  capacity: '',
  currentStudents: '0',
  status: 'ACTIVE',
  color: 'teal',
}

// ─── Color mapping ─────────────────────────────────────

const colorConfig: Record<string, { border: string; bg: string; dot: string; text: string }> = {
  teal: {
    border: 'border-l-teal-500',
    bg: 'bg-teal-500',
    dot: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
  },
  amber: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
  },
  red: {
    border: 'border-l-red-500',
    bg: 'bg-red-500',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  blue: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500',
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    border: 'border-l-green-500',
    bg: 'bg-green-500',
    dot: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
  },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    icon: X,
    dot: 'bg-slate-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: Wrench,
    dot: 'bg-amber-500',
  },
}

// ─── Component ─────────────────────────────────────────

export function TransportPage() {
  const { user } = useAppStore()
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const [buses, setBuses] = useState<BusData[]>([])
  const [stats, setStats] = useState<TransportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBus, setEditingBus] = useState<BusData | null>(null)
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingBus, setDeletingBus] = useState<BusData | null>(null)

  // ─── Data fetching ──────────────────────────────────

  const loadBuses = async () => {
    setLoading(true)
    try {
      const res = await transportApi.list(statusFilter !== 'ALL' ? { status: statusFilter } : undefined)
      if (res.success) {
        setBuses(res.data || [])
        setStats(res.stats || null)
      } else {
        toast.error(res.error || 'Failed to load buses')
      }
    } catch {
      toast.error('Failed to load buses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBuses()
  }, [statusFilter])

  // ─── Form handlers ──────────────────────────────────

  const openCreateDialog = () => {
    setEditingBus(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (bus: BusData) => {
    setEditingBus(bus)
    setFormData({
      busNumber: bus.busNumber,
      routeName: bus.routeName,
      driverName: bus.driverName,
      driverPhone: bus.driverPhone || '',
      capacity: String(bus.capacity),
      currentStudents: String(bus.currentStudents),
      status: bus.status,
      color: bus.color,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.busNumber || !formData.routeName || !formData.driverName || !formData.capacity) {
      toast.error('Please fill in all required fields')
      return
    }

    if (Number(formData.currentStudents) > Number(formData.capacity)) {
      toast.error('Current students cannot exceed capacity')
      return
    }

    setSaving(true)
    try {
      const payload = {
        busNumber: formData.busNumber,
        routeName: formData.routeName,
        driverName: formData.driverName,
        driverPhone: formData.driverPhone || null,
        capacity: Number(formData.capacity),
        currentStudents: Number(formData.currentStudents),
        status: formData.status,
        color: formData.color,
      }

      const res = editingBus
        ? await transportApi.update(editingBus.id, payload)
        : await transportApi.create(payload)

      if (res.success) {
        toast.success(editingBus ? 'Bus updated successfully' : 'Bus added successfully')
        setDialogOpen(false)
        loadBuses()
      } else {
        toast.error(res.error || 'Failed to save bus')
      }
    } catch {
      toast.error('Failed to save bus')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingBus) return

    try {
      const res = await transportApi.delete(deletingBus.id)
      if (res.success) {
        toast.success('Bus deactivated successfully')
        setDeleteDialogOpen(false)
        setDeletingBus(null)
        loadBuses()
      } else {
        toast.error(res.error || 'Failed to deactivate bus')
      }
    } catch {
      toast.error('Failed to deactivate bus')
    }
  }

  const getCapacityPercent = (bus: BusData) => {
    if (bus.capacity === 0) return 0
    return Math.round((bus.currentStudents / bus.capacity) * 100)
  }

  const getCapacityColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600 dark:text-red-400'
    if (percent >= 70) return 'text-amber-600 dark:text-amber-400'
    return 'text-emerald-600 dark:text-emerald-400'
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '[&>div]:bg-red-500'
    if (percent >= 70) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-emerald-500'
  }

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
            <Bus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              School Transport
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage school buses, routes &amp; drivers
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={openCreateDialog}
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Bus
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </>
        ) : stats ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.0 }}
            >
              <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl border-l-4 border-l-teal-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Buses</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stats.total}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                      <Bus className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl border-l-4 border-l-emerald-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.active}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Students Transported</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{stats.totalStudents}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl border-l-4 border-l-sky-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Capacity</p>
                      <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">{stats.totalCapacity}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                      <Gauge className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        ) : null}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Buses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadBuses}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Bus Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : buses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 rounded-2xl">
            <CardContent className="py-16 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-block"
              >
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Bus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
              </motion.div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No buses found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                {statusFilter !== 'ALL'
                  ? 'Try changing the filter to see more buses'
                  : 'Add your first school bus to get started'}
              </p>
              {statusFilter === 'ALL' && isAdmin && (
                <Button
                  onClick={openCreateDialog}
                  className="mt-4 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Bus
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {buses.map((bus, index) => {
              const cc = colorConfig[bus.color] || colorConfig.teal
              const sc = statusConfig[bus.status] || statusConfig.ACTIVE
              const pct = getCapacityPercent(bus)

              return (
                <motion.div
                  key={bus.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-300 bg-white dark:bg-slate-800 border-l-4 rounded-xl overflow-hidden group">
                    <CardContent className="p-5">
                      {/* Top: Bus Number + Status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn('h-9 w-9 rounded-lg flex items-center justify-center', cc.bg)}
                          >
                            <Bus className="w-4.5 h-4.5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {bus.busNumber}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <MapPin className="w-3 h-3" />
                              {bus.routeName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', sc.dot)} />
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] font-medium', sc.className)}
                          >
                            {sc.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Driver Info */}
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-700/20 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{bus.driverName}</p>
                          {bus.driverPhone && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {bus.driverPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Capacity Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Capacity</span>
                          <span className={cn('font-bold tabular-nums', getCapacityColor(pct))}>
                            {bus.currentStudents} / {bus.capacity}
                            <span className="text-slate-400 dark:text-slate-500 ml-1">({pct}%)</span>
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className={cn('h-2', getProgressColor(pct))}
                        />
                      </div>

                      {/* Actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(bus)}
                            className="h-8 text-xs text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:text-slate-400 dark:hover:text-teal-400 dark:hover:bg-teal-900/20"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingBus(bus)
                              setDeleteDialogOpen(true)
                            }}
                            className="h-8 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Deactivate
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Add/Edit Dialog ──────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingBus ? 'Edit Bus' : 'Add New Bus'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Bus Number */}
            <div className="space-y-2">
              <Label htmlFor="busNumber" className="text-sm font-medium">
                Bus Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="busNumber"
                placeholder="e.g. BUS-006"
                value={formData.busNumber}
                onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Route Name */}
            <div className="space-y-2">
              <Label htmlFor="routeName" className="text-sm font-medium">
                Route Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="routeName"
                placeholder="e.g. Kitale Route"
                value={formData.routeName}
                onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Driver Name */}
            <div className="space-y-2">
              <Label htmlFor="driverName" className="text-sm font-medium">
                Driver Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="driverName"
                placeholder="e.g. John Koech"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Driver Phone */}
            <div className="space-y-2">
              <Label htmlFor="driverPhone" className="text-sm font-medium">
                Driver Phone
              </Label>
              <Input
                id="driverPhone"
                placeholder="e.g. +254 712 345 678"
                value={formData.driverPhone}
                onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Capacity & Current Students */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-sm font-medium">
                  Capacity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="e.g. 45"
                  min={1}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentStudents" className="text-sm font-medium">
                  Current Students
                </Label>
                <Input
                  id="currentStudents"
                  type="number"
                  placeholder="0"
                  min={0}
                  value={formData.currentStudents}
                  onChange={(e) => setFormData({ ...formData, currentStudents: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            {/* Status & Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(val) => setFormData({ ...formData, color: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teal">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-teal-500" /> Teal
                      </span>
                    </SelectItem>
                    <SelectItem value="amber">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500" /> Amber
                      </span>
                    </SelectItem>
                    <SelectItem value="red">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" /> Red
                      </span>
                    </SelectItem>
                    <SelectItem value="blue">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500" /> Blue
                      </span>
                    </SelectItem>
                    <SelectItem value="green">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500" /> Green
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? 'Saving...' : editingBus ? 'Update Bus' : 'Add Bus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Deactivate Bus
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {deletingBus?.busNumber} — {deletingBus?.routeName}
              </span>
              ? The bus will be marked as inactive. Students assigned to this route may need reassignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              Deactivate Bus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
