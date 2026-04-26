'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bus,
  Plus,
  DollarSign,
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
  Route,
  UserPlus,
  ListChecks,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { feesApi, refApi, transportApi } from '@/lib/api'
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
import { FeeFormDialog } from '@/components/fees/FeeFormDialog'

function sortTermsBySequence(a: any, b: any) {
  const aNum = Number(String(a.name).match(/\d+/)?.[0] || '99')
  const bNum = Number(String(b.name).match(/\d+/)?.[0] || '99')
  return aNum - bNum
}

function pickLatestYearTerm(terms: any[]) {
  if (!terms.length) return null
  const currentYear = new Date().getFullYear()
  const years = terms.map((term: any) => Number(term.year) || 0).filter((year: number) => year > 0)
  const latestYear = years.includes(currentYear) ? currentYear : Math.max(...years)
  const inLatestYear = terms
    .filter((term: any) => Number(term.year) === latestYear)
    .sort(sortTermsBySequence)
  return inLatestYear.find((term: any) => term.status === 'ACTIVE') || inLatestYear[0] || null
}
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

interface EligibleStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  class?: { id: string; name: string; stream?: string | null } | null
  paidTransport: number
  assigned?: { busId: string; busNumber: string; routeName: string } | null
}

interface BusAssignment {
  id: string
  studentId: string
  busId: string
  paidAmount: number
  student: {
    firstName: string
    lastName: string
    admissionNumber: string
    class?: { id: string; name: string; stream?: string | null } | null
  }
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

interface TransportFeeStructureRow {
  id: string
  name: string
  amount: number
  status: string
  appliesToAllClasses?: boolean
  class: { id: string; name: string; stream?: string | null }
  term: { id: string; name: string; year: number; status: string }
}

interface TransportRosterRow {
  id: string
  name: string
  admissionNumber: string
  class: {
    id: string
    name: string
    stream?: string | null
  }
  transportFee: {
    expected: number
    paid: number
    balance: number
    paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID'
    paymentCount: number
    lastPaymentAt: string | null
    lastPaymentMethod: string | null
    lastPaymentAmount: number
    lastReceiptNumber: string | null
    suggestedFeeStructureId: string | null
  }
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
  const canAssignTransport = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'SECRETARY'].includes(user?.role || '')
  const canManageTransportFees = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'BURSAR'].includes(user?.role || '')

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
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudent[]>([])
  const [busAssignments, setBusAssignments] = useState<BusAssignment[]>([])
  const [selectedBusId, setSelectedBusId] = useState('')
  const [assignmentTermId, setAssignmentTermId] = useState('')
  const [assignmentClassFilter, setAssignmentClassFilter] = useState('ALL')
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDialogStudent, setAssignDialogStudent] = useState<EligibleStudent | null>(null)
  const [assignDialogBusId, setAssignDialogBusId] = useState('')
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [localTerms, setLocalTerms] = useState<any[]>([])
  const [localClasses, setLocalClasses] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<TransportFeeStructureRow[]>([])
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeSaving, setFeeSaving] = useState(false)
  const [bulkFeeSaving, setBulkFeeSaving] = useState(false)
  const [feeTermId, setFeeTermId] = useState('')
  const [feeClassId, setFeeClassId] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [transportPaymentDialogOpen, setTransportPaymentDialogOpen] = useState(false)
  const [paymentClassFilter, setPaymentClassFilter] = useState('ALL')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [transportRoster, setTransportRoster] = useState<TransportRosterRow[]>([])
  const [transportSummary, setTransportSummary] = useState<{
    expectedTotal: number
    paidTotal: number
    balanceTotal: number
    paidStudents: number
    partialStudents: number
    unpaidStudents: number
  } | null>(null)
  const [transportRosterLoading, setTransportRosterLoading] = useState(false)
  const [transportPaymentPrefill, setTransportPaymentPrefill] = useState<{
    studentId?: string
    classId?: string
    feeStructureId?: string
    termId?: string
    amount?: number
  } | null>(null)

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

  useEffect(() => {
    if (buses.length > 0 && !selectedBusId) {
      const firstActive = buses.find((b) => b.status === 'ACTIVE') || buses[0]
      setSelectedBusId(firstActive?.id || '')
    }
  }, [buses, selectedBusId])

  const loadAssignmentData = async (busId = selectedBusId) => {
    if (!canAssignTransport) return
    setAssignmentLoading(true)
    try {
      const eligiblePromise = transportApi.eligibleStudents(assignmentTermId || undefined)
      const assignmentsPromise = busId
        ? transportApi.assignments({ busId, termId: assignmentTermId || undefined })
        : Promise.resolve({ success: true, data: [], meta: { termId: assignmentTermId || null } })
      const [eligibleRes, assignmentsRes] = await Promise.all([eligiblePromise, assignmentsPromise])

      if (eligibleRes.success) {
        setEligibleStudents(eligibleRes.data || [])
        if (!assignmentTermId && eligibleRes.meta?.termId) {
          setAssignmentTermId(eligibleRes.meta.termId)
        }
      }
      if (assignmentsRes.success) {
        setBusAssignments(assignmentsRes.data || [])
        if (!assignmentTermId && assignmentsRes.meta?.termId) {
          setAssignmentTermId(assignmentsRes.meta.termId)
        }
      }
    } catch {
      toast.error('Failed to load transport assignment data')
    } finally {
      setAssignmentLoading(false)
    }
  }

  useEffect(() => {
    if (canAssignTransport) {
      loadAssignmentData(selectedBusId)
    }
  }, [canAssignTransport, selectedBusId])

  const loadFeeReferences = async () => {
    if (!canManageTransportFees && !canAssignTransport) return
    try {
      const [termsRes, classesRes] = await Promise.all([refApi.terms(), refApi.classes()])
      if (termsRes.success && termsRes.data) {
        setLocalTerms(termsRes.data)
        const preferredTerm = pickLatestYearTerm(termsRes.data)
        if (preferredTerm && !feeTermId) setFeeTermId(preferredTerm.id)
      }
      if (classesRes.success && classesRes.data) {
        setLocalClasses(classesRes.data)
      }
    } catch {
      toast.error('Failed to load classes/terms for transport fees')
    }
  }

  const loadTransportFeeStructures = async () => {
    if (!canManageTransportFees || !feeTermId) return
    setFeeLoading(true)
    try {
      const res = await transportApi.feeStructures({ termId: feeTermId })
      if (res.success) {
        setFeeStructures(res.data || [])
      } else {
        toast.error(res.error || 'Failed to load transport fee structures')
      }
    } catch {
      toast.error('Failed to load transport fee structures')
    } finally {
      setFeeLoading(false)
    }
  }

  useEffect(() => {
    loadFeeReferences()
  }, [canManageTransportFees, canAssignTransport])

  useEffect(() => {
    if (canManageTransportFees && feeTermId) {
      loadTransportFeeStructures()
    }
  }, [canManageTransportFees, feeTermId])

  const handleSaveTransportFeeStructure = async () => {
    if (!feeClassId || !feeTermId || !feeAmount) {
      toast.error('Class, term, and amount are required')
      return
    }
    setFeeSaving(true)
    try {
      const res = await transportApi.saveFeeStructure({
        classId: feeClassId,
        termId: feeTermId,
        amount: Number(feeAmount),
      })
      if (res.success) {
        toast.success('Transport fee structure saved')
        setFeeAmount('')
        await loadTransportFeeStructures()
      } else {
        toast.error(res.error || 'Failed to save transport fee structure')
      }
    } catch {
      toast.error('Failed to save transport fee structure')
    } finally {
      setFeeSaving(false)
    }
  }

  const handleSaveTransportFeeStructureAllClasses = async () => {
    if (!feeTermId || !feeAmount) {
      toast.error('Term and amount are required')
      return
    }
    setBulkFeeSaving(true)
    try {
      const res = await transportApi.saveFeeStructure({
        classId: 'ALL' as any,
        termId: feeTermId,
        amount: Number(feeAmount),
      })
      if (res.success) {
        toast.success('Transport fee structure applied across all active classes')
        setFeeAmount('')
        await loadTransportFeeStructures()
      } else {
        toast.error(res.error || 'Failed to apply transport fee structure to all classes')
      }
    } catch {
      toast.error('Failed to apply transport fee structure to all classes')
    } finally {
      setBulkFeeSaving(false)
    }
  }

  const loadTransportRoster = useCallback(async () => {
    if (!canManageTransportFees) return
    setTransportRosterLoading(true)
    try {
      const selectedClassId = paymentClassFilter !== 'ALL' ? paymentClassFilter : undefined
      const res = await feesApi.transportRoster({
        classId: selectedClassId,
        termId: feeTermId || undefined,
      })
      if (res.success && res.data) {
        setTransportRoster(res.data.students || [])
        setTransportSummary(res.data.summary || null)
      } else {
        setTransportRoster([])
        setTransportSummary(null)
      }
    } catch {
      setTransportRoster([])
      setTransportSummary(null)
      toast.error('Failed to load transport fee roster')
    } finally {
      setTransportRosterLoading(false)
    }
  }, [canManageTransportFees, paymentClassFilter, feeTermId])

  useEffect(() => {
    if (canManageTransportFees) {
      loadTransportRoster()
    }
  }, [canManageTransportFees, feeTermId, paymentClassFilter, loadTransportRoster])

  const openTransportPaymentDialog = (prefill?: {
    studentId?: string
    classId?: string
    feeStructureId?: string | null
    termId?: string
    amount?: number
  }) => {
    const resolvedTermId = prefill?.termId || feeTermId || assignmentTermId || undefined
    const resolvedClassId =
      prefill?.classId || (paymentClassFilter !== 'ALL' ? paymentClassFilter : undefined)
    const resolvedFeeStructureId =
      prefill?.feeStructureId ||
      feeStructures.find((item) =>
        item.class.id === resolvedClassId &&
        (!resolvedTermId || item.term.id === resolvedTermId)
      )?.id ||
      feeStructures.find((item) =>
        item.appliesToAllClasses &&
        (!resolvedTermId || item.term.id === resolvedTermId)
      )?.id

    setTransportPaymentPrefill({
      studentId: prefill?.studentId,
      classId: resolvedClassId,
      feeStructureId: resolvedFeeStructureId || undefined,
      termId: resolvedTermId,
      amount: prefill?.amount,
    })
    setTransportPaymentDialogOpen(true)
  }

  const formatCurrency = (value: number) =>
    `KES ${Number(value || 0).toLocaleString()}`

  const filteredTransportRoster = transportRoster.filter((student) => {
    const query = paymentSearch.trim().toLowerCase()
    if (!query) return true
    return (
      student.name.toLowerCase().includes(query) ||
      student.admissionNumber.toLowerCase().includes(query) ||
      student.class.name.toLowerCase().includes(query)
    )
  })

  const filteredEligibleStudents = eligibleStudents.filter((student) => {
    if (assignmentClassFilter === 'ALL') return true
    return student.class?.id === assignmentClassFilter
  })

  const filteredBusAssignments = busAssignments.filter((item) => {
    if (assignmentClassFilter === 'ALL') return true
    return item.student.class?.id === assignmentClassFilter
  })
  const activeBuses = buses.filter((bus) => bus.status === 'ACTIVE')

  const selectedPaymentClassName =
    paymentClassFilter === 'ALL'
      ? 'All Classes'
      : (localClasses.find((schoolClass: any) => schoolClass.id === paymentClassFilter)?.name || 'Selected Class')

  const selectedAssignmentClassName =
    assignmentClassFilter === 'ALL'
      ? 'All Classes'
      : (localClasses.find((schoolClass: any) => schoolClass.id === assignmentClassFilter)?.name || 'Selected Class')

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeClasses = localClasses.filter((schoolClass: any) => schoolClass.status === 'ACTIVE')
  const sortedActiveClasses = [...activeClasses].sort((a: any, b: any) => {
    const aLabel = `${a.name || ''} ${a.stream || ''}`.trim().toLowerCase()
    const bLabel = `${b.name || ''} ${b.stream || ''}`.trim().toLowerCase()
    return aLabel.localeCompare(bLabel)
  })
  const explicitAllClassesStructure = feeStructures.find((item) => item.appliesToAllClasses)
  const uniqueStructureAmounts = Array.from(
    new Set(feeStructures.map((item) => Number(item.amount || 0)))
  )
  const showUnifiedStructureRow =
    Boolean(explicitAllClassesStructure) ||
    (
      feeStructures.length > 1 &&
      activeClasses.length > 0 &&
      feeStructures.length === activeClasses.length &&
      uniqueStructureAmounts.length === 1
    )

  const handleAssignStudent = async (studentId: string, busId = selectedBusId) => {
    if (!busId) {
      toast.error('Select a bus first')
      return
    }
    setAssigningStudentId(studentId)
    try {
      const res = await transportApi.assignStudent({
        studentId,
        busId,
        termId: assignmentTermId || undefined,
      })
      if (res.success) {
        toast.success('Student assigned to bus')
        setSelectedBusId(busId)
        await Promise.all([loadBuses(), loadAssignmentData(busId)])
      } else {
        toast.error(res.error || 'Failed to assign student')
      }
    } catch {
      toast.error('Failed to assign student')
    } finally {
      setAssigningStudentId(null)
    }
  }

  const openAssignStudentDialog = (student: EligibleStudent) => {
    const suggestedBusId =
      student.assigned?.busId ||
      selectedBusId ||
      activeBuses[0]?.id ||
      ''
    setAssignDialogStudent(student)
    setAssignDialogBusId(suggestedBusId)
    setAssignDialogOpen(true)
  }

  const handleConfirmAssignStudent = async () => {
    if (!assignDialogStudent) return
    if (!assignDialogBusId) {
      toast.error('Please select a bus')
      return
    }

    await handleAssignStudent(assignDialogStudent.id, assignDialogBusId)
    setAssignDialogOpen(false)
    setAssignDialogStudent(null)
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    setRemovingAssignmentId(assignmentId)
    try {
      const res = await transportApi.removeAssignment(assignmentId)
      if (res.success) {
        toast.success('Student removed from bus')
        await Promise.all([loadBuses(), loadAssignmentData(selectedBusId)])
      } else {
        toast.error(res.error || 'Failed to remove assignment')
      }
    } catch {
      toast.error('Failed to remove assignment')
    } finally {
      setRemovingAssignmentId(null)
    }
  }

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

      <Card className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/70 dark:to-slate-800 border-slate-200/70 dark:border-slate-700/70 shadow-sm rounded-xl">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mr-1">
              Quick Navigate
            </p>
            {canManageTransportFees && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => scrollToSection('transport-fee-structures')}
                >
                  Fee Structures
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => scrollToSection('transport-payments')}
                >
                  Payments
                </Button>
              </>
            )}
            {canAssignTransport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => scrollToSection('transport-assignment')}
              >
                Assignment
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => scrollToSection('transport-fleet')}
            >
              Bus Fleet
            </Button>
          </div>
        </CardContent>
      </Card>

      <section id="transport-fleet" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fleet Overview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track bus performance, capacity usage, and route status at a glance.
            </p>
          </div>
        </div>

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

        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="font-medium">Bus Status:</span>
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
            className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Fleet
          </Button>
        </div>


      <Dialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open)
          if (!open) setAssignDialogStudent(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{assignDialogStudent?.assigned ? 'Move Student to Bus' : 'Assign Student to Bus'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-900/40">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {assignDialogStudent?.firstName} {assignDialogStudent?.lastName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {assignDialogStudent?.admissionNumber}
                {assignDialogStudent?.class?.name ? ` - ${assignDialogStudent.class.name}` : ''}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Bus</Label>
              <Select value={assignDialogBusId} onValueChange={setAssignDialogBusId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose a bus" />
                </SelectTrigger>
                <SelectContent>
                  {activeBuses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                        {bus.busNumber} - {bus.routeName} ({bus.currentStudents}/{bus.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeBuses.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No active buses available. Activate or add a bus first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssignStudent}
              disabled={!assignDialogBusId || assigningStudentId === assignDialogStudent?.id}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {assigningStudentId === assignDialogStudent?.id
                ? 'Saving...'
                : assignDialogStudent?.assigned
                  ? 'Move Student'
                  : 'Assign Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManageTransportFees && (
        <FeeFormDialog
          open={transportPaymentDialogOpen}
          onClose={() => {
            setTransportPaymentDialogOpen(false)
            setTransportPaymentPrefill(null)
          }}
          onSuccess={() => {
            loadAssignmentData(selectedBusId)
            loadTransportFeeStructures()
            loadTransportRoster()
            loadBuses()
          }}
          mode="payment"
          paymentCategory="TRANSPORT"
          initialPayment={transportPaymentPrefill || {
            classId: paymentClassFilter !== 'ALL' ? paymentClassFilter : undefined,
            termId: feeTermId || assignmentTermId || undefined,
          }}
        />
      )}

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
      </section>

      {canAssignTransport && (
        <Card id="transport-assignment" className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Route className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Transport Fee Paid Students
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  View: {selectedAssignmentClassName}. Assign only students with completed transport fee payment.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedBusId} onValueChange={(value) => { setSelectedBusId(value); loadAssignmentData(value) }}>
                  <SelectTrigger className="w-[260px] h-9 bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select bus for assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBuses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.busNumber} - {bus.routeName} ({bus.currentStudents}/{bus.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assignmentClassFilter} onValueChange={setAssignmentClassFilter}>
                  <SelectTrigger className="w-[220px] h-9 bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Classes</SelectItem>
                    {localClasses.filter((schoolClass: any) => schoolClass.status === 'ACTIVE').map((schoolClass: any) => (
                      <SelectItem key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.name}{schoolClass.stream ? ` ${schoolClass.stream}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => loadAssignmentData(selectedBusId)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reload
                </Button>
                {canManageTransportFees && (
                  <Button
                    size="sm"
                    className="h-9 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => openTransportPaymentDialog()}
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    Eligible (Paid Transport)
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {assignmentLoading ? (
                    <div className="p-3 space-y-2">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                    </div>
                  ) : filteredEligibleStudents.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 p-3">No transport-paid students found for this class.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredEligibleStudents.map((student) => (
                        <div key={student.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {student.admissionNumber} • {student.class?.name || 'No class'} • KES {student.paidTransport.toLocaleString()}
                            </p>
                            {student.assigned && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                Currently: {student.assigned.busNumber}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
                            disabled={assigningStudentId === student.id || activeBuses.length === 0}
                            onClick={() => openAssignStudentDialog(student)}
                          >
                            {assigningStudentId === student.id ? 'Assigning...' : student.assigned ? 'Move' : 'Assign'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Assigned to Selected Bus
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {assignmentLoading ? (
                    <div className="p-3 space-y-2">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                    </div>
                  ) : filteredBusAssignments.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 p-3">No assigned students for this bus in the selected class.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredBusAssignments.map((item) => (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {item.student.firstName} {item.student.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {item.student.admissionNumber} • {item.student.class?.name || 'No class'} • Paid KES {item.paidAmount.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            disabled={removingAssignmentId === item.id}
                            onClick={() => handleRemoveAssignment(item.id)}
                          >
                            {removingAssignmentId === item.id ? 'Removing...' : 'Remove'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {canManageTransportFees && (
        <Card id="transport-fee-structures" className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Transport Fee Structures
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Configure transport fee by term for a class or quickly apply one amount across all active classes.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px]">
                    {activeClasses.length} Active Classes
                  </Badge>
                    {showUnifiedStructureRow && (
                      <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-[11px]">
                      All-Classes Structure Active
                      </Badge>
                    )}
                </div>
              </div>
              <Button
                size="sm"
                className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white self-start"
                onClick={() => openTransportPaymentDialog()}
              >
                Record Transport Payment
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-900/30 p-3.5 space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">Term</Label>
                  <Select value={feeTermId} onValueChange={setFeeTermId}>
                    <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {localTerms.map((term: any) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name} {term.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">Class</Label>
                  <Select value={feeClassId} onValueChange={setFeeClassId}>
                    <SelectTrigger className="h-10 bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="ALL">All Classes</SelectItem>
                      {sortedActiveClasses.map((schoolClass: any) => (
                        <SelectItem key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.name}{schoolClass.stream ? ` ${schoolClass.stream}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide text-slate-600 dark:text-slate-300">Amount (KES)</Label>
                  <Input
                    type="number"
                    value={feeAmount}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    className="h-10 bg-white dark:bg-slate-900"
                    placeholder="e.g. 6500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  onClick={handleSaveTransportFeeStructure}
                  disabled={feeSaving || !feeClassId}
                  className="h-10 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {feeSaving ? 'Saving...' : 'Save Selected Class'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveTransportFeeStructureAllClasses}
                  disabled={bulkFeeSaving || !feeAmount}
                  className="h-10"
                >
                  {bulkFeeSaving ? 'Applying...' : 'Apply to All Classes'}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/40">
              <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Current Transport Structures</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {feeStructures.length} {feeStructures.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {feeLoading ? (
                  <div className="p-3 space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                  </div>
                ) : feeStructures.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No structures for this term yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Set an amount and save for a class or apply to all classes.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {showUnifiedStructureRow ? (
                      <div className="px-3.5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 dark:text-slate-100 truncate font-semibold">
                            All Active Classes
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {activeClasses.length} classes covered
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                          KES {Number(explicitAllClassesStructure?.amount ?? uniqueStructureAmounts[0] ?? 0).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      feeStructures.map((item) => (
                        <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                            {item.class.name}{item.class.stream ? ` ${item.class.stream}` : ''}
                          </p>
                          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                            KES {Number(item.amount || 0).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageTransportFees && (
        <Card id="transport-payments" className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-xl">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  Day Students Transport Payments
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  View: {selectedPaymentClassName}. Update payment per student and keep full payment history.
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={loadTransportRoster}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reload
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={paymentClassFilter} onValueChange={setPaymentClassFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {localClasses.filter((schoolClass: any) => schoolClass.status === 'ACTIVE').map((schoolClass: any) => (
                    <SelectItem key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}{schoolClass.stream ? ` ${schoolClass.stream}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={paymentSearch}
                  onChange={(event) => setPaymentSearch(event.target.value)}
                  className="h-9 pl-9"
                  placeholder="Search student, admission number, or class..."
                />
              </div>
            </div>

            {transportSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Expected</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(transportSummary.expectedTotal)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Paid</p>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(transportSummary.paidTotal)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Balance</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{formatCurrency(transportSummary.balanceTotal)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Paid Students</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{transportSummary.paidStudents}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Partial</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{transportSummary.partialStudents}</p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Unpaid</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{transportSummary.unpaidStudents}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2 font-semibold">Student</th>
                    <th className="px-3 py-2 font-semibold">Class</th>
                    <th className="px-3 py-2 font-semibold">Expected</th>
                    <th className="px-3 py-2 font-semibold">Paid</th>
                    <th className="px-3 py-2 font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Last Payment</th>
                    <th className="px-3 py-2 font-semibold w-24">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transportRosterLoading ? (
                    [...Array(4)].map((_, index) => (
                      <tr key={index} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-8 w-16" /></td>
                      </tr>
                    ))
                  ) : filteredTransportRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No day students found for this class/term.
                      </td>
                    </tr>
                  ) : (
                    filteredTransportRoster.map((student) => (
                      <tr key={student.id} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{student.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{student.admissionNumber}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {student.class.name}{student.class.stream ? ` ${student.class.stream}` : ''}
                        </td>
                        <td className="px-3 py-2">{formatCurrency(student.transportFee.expected)}</td>
                        <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300">{formatCurrency(student.transportFee.paid)}</td>
                        <td className="px-3 py-2 text-amber-700 dark:text-amber-300">{formatCurrency(student.transportFee.balance)}</td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                          {student.transportFee.lastPaymentAt
                            ? new Date(student.transportFee.lastPaymentAt).toLocaleString()
                            : 'No payment yet'}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => openTransportPaymentDialog({
                              studentId: student.id,
                              classId: student.class.id,
                              feeStructureId:
                                student.transportFee.suggestedFeeStructureId ||
                                feeStructures.find((item) =>
                                  item.class.id === student.class.id &&
                                  (!feeTermId || item.term.id === feeTermId)
                                )?.id ||
                                feeStructures.find((item) =>
                                  item.appliesToAllClasses &&
                                  (!feeTermId || item.term.id === feeTermId)
                                )?.id ||
                                undefined,
                              termId: feeTermId || assignmentTermId || undefined,
                              amount: student.transportFee.balance > 0
                                ? student.transportFee.balance
                                : student.transportFee.expected,
                            })}
                          >
                            Update
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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



