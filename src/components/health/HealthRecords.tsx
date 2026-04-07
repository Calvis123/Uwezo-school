'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  HeartPulse,
  ClipboardList,
  AlertTriangle,
  Calendar,
  Activity,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Stethoscope,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { healthApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

// ============ CONSTANTS ============

const RECORD_TYPES = [
  { value: 'ALLERGY', label: 'Allergy', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { value: 'ILLNESS', label: 'Illness', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'INJURY', label: 'Injury', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'CHECKUP', label: 'Checkup', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { value: 'VACCINATION', label: 'Vaccination', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'DENTAL', label: 'Dental', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'EYE_EXAM', label: 'Eye Exam', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'SPECIAL_NEED', label: 'Special Need', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
]

const SEVERITY_CONFIG: Record<string, { color: string; dot: string; label: string }> = {
  MILD: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', dot: 'bg-green-500', label: 'Mild' },
  MODERATE: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500', label: 'Moderate' },
  SEVERE: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500', label: 'Severe' },
  CRITICAL: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-500', label: 'Critical' },
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Active' },
  RESOLVED: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', label: 'Resolved' },
  ONGOING: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Ongoing' },
  MONITORING: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', label: 'Monitoring' },
}

const CONDITION_TYPES = [
  'ASTHMA', 'DIABETES', 'EPILEPSY', 'HEART_CONDITION', 'ALLERGY', 'ADHD', 'VISION', 'HEARING', 'SICKLE_CELL', 'OTHER'
]

const CONDITION_COLORS: Record<string, string> = {
  ASTHMA: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  DIABETES: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EPILEPSY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  HEART_CONDITION: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ALLERGY: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  ADHD: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  VISION: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  HEARING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  SICKLE_CELL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

function getRecordTypeBadge(type: string) {
  const t = RECORD_TYPES.find((r) => r.value === type)
  return t?.color || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
}

function getRecordTypeLabel(type: string) {
  const t = RECORD_TYPES.find((r) => r.value === type)
  return t?.label || type
}

function formatLabel(str: string) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============ MAIN COMPONENT ============

export function HealthRecords() {
  // Records state
  const [records, setRecords] = useState<any[]>([])
  const [recordStats, setRecordStats] = useState<any>(null)
  const [recordLoading, setRecordLoading] = useState(true)
  const [recordPage, setRecordPage] = useState(1)
  const [recordTotalPages, setRecordTotalPages] = useState(1)
  const [recordTotal, setRecordTotal] = useState(0)

  // Conditions state
  const [conditions, setConditions] = useState<any[]>([])
  const [conditionStats, setConditionStats] = useState<any>(null)
  const [conditionLoading, setConditionLoading] = useState(true)
  const [conditionPage, setConditionPage] = useState(1)
  const [conditionTotalPages, setConditionTotalPages] = useState(1)

  // Overview
  const [overview, setOverview] = useState<any>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [recordTypeFilter, setRecordTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [conditionSearch, setConditionSearch] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')

  // Dialogs
  const [addRecordOpen, setAddRecordOpen] = useState(false)
  const [viewRecordOpen, setViewRecordOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string>('')
  const [deleteType, setDeleteType] = useState<'record' | 'condition'>('record')
  const [addConditionOpen, setAddConditionOpen] = useState(false)
  const [editConditionOpen, setEditConditionOpen] = useState(false)
  const [editCondition, setEditCondition] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Students for dropdown
  const [students, setStudents] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  // ============ DATA LOADING ============

  const loadRecords = useCallback(async () => {
    setRecordLoading(true)
    try {
      const res = await healthApi.records({
        page: recordPage,
        limit: 15,
        search: search || undefined,
        recordType: recordTypeFilter || undefined,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      })
      if (res.success) {
        setRecords(res.data || [])
        setRecordTotalPages(res.pagination?.pages || 1)
        setRecordTotal(res.pagination?.total || 0)
        setRecordStats(res.stats || null)
      }
    } catch {
      // silent
    } finally {
      setRecordLoading(false)
    }
  }, [recordPage, search, recordTypeFilter, severityFilter, statusFilter])

  const loadConditions = useCallback(async () => {
    setConditionLoading(true)
    try {
      const res = await healthApi.conditions({
        page: conditionPage,
        limit: 15,
        search: conditionSearch || undefined,
        condition: conditionFilter || undefined,
      })
      if (res.success) {
        setConditions(res.data || [])
        setConditionTotalPages(res.pagination?.pages || 1)
        setConditionStats(res.stats || null)
      }
    } catch {
      // silent
    } finally {
      setConditionLoading(false)
    }
  }, [conditionPage, conditionSearch, conditionFilter])

  const loadOverview = useCallback(async () => {
    try {
      const res = await healthApi.overview()
      if (res.success) {
        setOverview(res.data)
      }
    } catch {
      // silent
    }
  }, [])

  const loadStudents = useCallback(async (q?: string) => {
    try {
      const { studentsApi } = await import('@/lib/api')
      const res = await studentsApi.list({ search: q || '', limit: 20 })
      if (res.success) {
        setStudents(res.data?.students || [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadRecords()
    loadOverview()
  }, [loadRecords, loadOverview])

  useEffect(() => {
    loadConditions()
  }, [loadConditions])

  // ============ HANDLERS ============

  const handleCreateRecord = async (data: any) => {
    setSubmitting(true)
    try {
      const res = await healthApi.createRecord(data)
      if (res.success) {
        toast.success('Health record created successfully')
        setAddRecordOpen(false)
        loadRecords()
        loadOverview()
      } else {
        toast.error(res.error || 'Failed to create record')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCondition = async (data: any) => {
    setSubmitting(true)
    try {
      const res = await healthApi.createCondition(data)
      if (res.success) {
        toast.success('Health condition added successfully')
        setAddConditionOpen(false)
        loadConditions()
      } else {
        toast.error(res.error || 'Failed to add condition')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCondition = async (id: string, data: any) => {
    setSubmitting(true)
    try {
      const res = await healthApi.updateCondition(id, data)
      if (res.success) {
        toast.success('Health condition updated')
        setEditConditionOpen(false)
        setEditCondition(null)
        loadConditions()
      } else {
        toast.error(res.error || 'Failed to update')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = deleteType === 'record'
        ? await healthApi.deleteRecord(deleteId)
        : await healthApi.deleteCondition(deleteId)
      if (res.success) {
        toast.success('Deleted successfully')
        setDeleteConfirmOpen(false)
        if (deleteType === 'record') loadRecords()
        else loadConditions()
      } else {
        toast.error(res.error || 'Failed to delete')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRecordTypeFilter('')
    setSeverityFilter('')
    setStatusFilter('')
    setRecordPage(1)
  }

  // ============ RENDER ============

  return (
    <div className="space-y-4">
      {/* Health Alert Banner */}
      {overview && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-xl p-4 border',
            overview.upcomingFollowUps?.length > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40'
              : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/40'
          )}
        >
          <div className="flex items-center gap-3">
            {overview.upcomingFollowUps?.length > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {overview.upcomingFollowUps.length} student{overview.upcomingFollowUps.length > 1 ? 's' : ''} with upcoming follow-ups
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {overview.criticalRecords > 0 ? `${overview.criticalRecords} critical case${overview.criticalRecords > 1 ? 's' : ''} require attention · ` : ''}
                    Next follow-up: {overview.upcomingFollowUps[0]?.followUpDate ? format(new Date(overview.upcomingFollowUps[0].followUpDate), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                <p className="text-sm font-medium text-teal-800 dark:text-teal-200">
                  ✓ All clear — no pending health follow-ups
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="records">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto min-w-max">
            <TabsTrigger
              value="records"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Health Records
            </TabsTrigger>
            <TabsTrigger
              value="conditions"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Chronic Conditions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============ RECORDS TAB ============ */}
        <TabsContent value="records" className="mt-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {recordStats ? (
              <>
                {[
                  { label: 'Total Records', value: recordStats.totalRecords, icon: FileText, gradient: 'from-teal-500 to-teal-700', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                  { label: 'Active Conditions', value: recordStats.activeConditions, icon: Shield, gradient: 'from-amber-500 to-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Upcoming Follow-ups', value: recordStats.upcomingFollowUps, icon: Calendar, gradient: 'from-sky-500 to-sky-700', bg: 'bg-sky-50 dark:bg-sky-900/20' },
                  { label: 'This Month Visits', value: recordStats.recentVisits, icon: Stethoscope, gradient: 'from-green-500 to-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
                      <div className={cn('h-1 bg-gradient-to-r', stat.gradient)} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{stat.value}</p>
                          </div>
                          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', stat.bg)}>
                            <stat.icon className={cn('w-5 h-5 bg-gradient-to-r bg-clip-text', stat.gradient)} style={{ color: 'inherit' }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </>
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            )}
          </div>

          {/* Header + Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>{recordTotal} records found</span>
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              onClick={() => { setAddRecordOpen(true); loadStudents() }}
            >
              <Plus className="w-4 h-4" />
              Add Record
            </Button>
          </div>

          {/* Filters */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search records or students..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setRecordPage(1) }}
                    className="pl-9"
                  />
                </div>
                <Select value={recordTypeFilter} onValueChange={(v) => { setRecordTypeFilter(v === 'ALL' ? '' : v); setRecordPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Record Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {RECORD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v === 'ALL' ? '' : v); setRecordPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severity</SelectItem>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setRecordPage(1) }}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(search || recordTypeFilter || severityFilter || statusFilter) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          {recordLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="py-12 text-center">
                <HeartPulse className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No health records found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or filters</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Student</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Title</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Severity</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record, idx) => (
                        <TableRow
                          key={record.id}
                          className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                          onClick={() => { setSelectedRecord(record); setViewRecordOpen(true) }}
                        >
                          <TableCell className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {format(new Date(record.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {record.student?.firstName} {record.student?.lastName}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">#{record.student?.admissionNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px]', getRecordTypeBadge(record.recordType))}>
                              {getRecordTypeLabel(record.recordType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                            {record.title}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-2 h-2 rounded-full', SEVERITY_CONFIG[record.severity]?.dot)} />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{SEVERITY_CONFIG[record.severity]?.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge className={cn('text-[10px]', STATUS_CONFIG[record.status]?.color)}>
                              {STATUS_CONFIG[record.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setViewRecordOpen(true) }}>
                                  <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(record.id); setDeleteType('record'); setDeleteConfirmOpen(true) }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {recordTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {(recordPage - 1) * 15 + 1} to {Math.min(recordPage * 15, recordTotal)} of {recordTotal}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={recordPage <= 1} onClick={() => setRecordPage(recordPage - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(recordTotalPages, 5) }, (_, i) => {
                      const p = i + 1
                      return (
                        <Button key={p} variant={recordPage === p ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setRecordPage(p)}>
                          {p}
                        </Button>
                      )
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={recordPage >= recordTotalPages} onClick={() => setRecordPage(recordPage + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============ CONDITIONS TAB ============ */}
        <TabsContent value="conditions" className="mt-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {conditionStats ? (
              <>
                {[
                  { label: 'Students with Conditions', value: conditionStats.totalStudentsWithConditions, icon: HeartPulse, gradient: 'from-teal-500 to-teal-700', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                  { label: 'Conditions by Type', value: conditionStats.conditionTypes?.length || 0, icon: Activity, gradient: 'from-purple-500 to-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { label: 'Moderate/Severe Cases', value: conditionStats.severeCases, icon: AlertTriangle, gradient: 'from-red-500 to-red-700', bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
                      <div className={cn('h-1 bg-gradient-to-r', stat.gradient)} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{stat.value}</p>
                          </div>
                          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', stat.bg)}>
                            <stat.icon className={cn('w-5 h-5 bg-gradient-to-r bg-clip-text', stat.gradient)} style={{ color: 'inherit' }} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            )}
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>Chronic health conditions</span>
            </div>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              onClick={() => { setAddConditionOpen(true); loadStudents() }}
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search conditions or students..."
                value={conditionSearch}
                onChange={(e) => { setConditionSearch(e.target.value); setConditionPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={conditionFilter} onValueChange={(v) => { setConditionFilter(v === 'ALL' ? '' : v); setConditionPage(1) }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Condition Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Conditions</SelectItem>
                {CONDITION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(conditionSearch || conditionFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setConditionSearch(''); setConditionFilter(''); setConditionPage(1) }} className="gap-1">
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Conditions Table */}
          {conditionLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : conditions.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No chronic conditions found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No students have recorded health conditions yet</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                        <TableHead className="text-xs">Student</TableHead>
                        <TableHead className="text-xs">Condition</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Severity</TableHead>
                        <TableHead className="text-xs hidden md:table-cell">Chronic</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Diagnosed</TableHead>
                        <TableHead className="text-xs hidden lg:table-cell">Notes</TableHead>
                        <TableHead className="text-xs w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conditions.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <TableCell>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {c.student?.firstName} {c.student?.lastName}
                            </p>
                            <p className="text-xs text-slate-400">#{c.student?.admissionNumber}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-[10px]', CONDITION_COLORS[c.condition] || 'bg-slate-100 text-slate-700')}>
                              {formatLabel(c.condition)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-2 h-2 rounded-full', SEVERITY_CONFIG[c.severity]?.dot)} />
                              <span className="text-xs text-slate-600 dark:text-slate-400">{SEVERITY_CONFIG[c.severity]?.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant={c.isChronic ? 'default' : 'secondary'} className="text-[10px]">
                              {c.isChronic ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                            {c.diagnosedDate ? format(new Date(c.diagnosedDate), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-slate-500 max-w-[200px] truncate">
                            {c.notes || c.description || '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditCondition(c); setEditConditionOpen(true) }}>
                                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => { setDeleteId(c.id); setDeleteType('condition'); setDeleteConfirmOpen(true) }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {conditionTotalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Page {conditionPage} of {conditionTotalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={conditionPage <= 1} onClick={() => setConditionPage(conditionPage - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={conditionPage >= conditionTotalPages} onClick={() => setConditionPage(conditionPage + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ============ ADD RECORD DIALOG ============ */}
      <AddRecordDialog
        open={addRecordOpen}
        onOpenChange={setAddRecordOpen}
        students={students}
        onSubmit={handleCreateRecord}
        loading={submitting}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        loadStudents={loadStudents}
      />

      {/* ============ VIEW RECORD DIALOG ============ */}
      <Dialog open={viewRecordOpen} onOpenChange={setViewRecordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-teal-600" />
              Health Record Details
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedRecord.student?.firstName} {selectedRecord.student?.lastName}
                  </p>
                  <p className="text-xs text-slate-500">#{selectedRecord.student?.admissionNumber}</p>
                </div>
                <Badge className={cn('text-[10px]', getRecordTypeBadge(selectedRecord.recordType))}>
                  {getRecordTypeLabel(selectedRecord.recordType)}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(selectedRecord.date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Severity</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={cn('w-2 h-2 rounded-full', SEVERITY_CONFIG[selectedRecord.severity]?.dot)} />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{SEVERITY_CONFIG[selectedRecord.severity]?.label}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                    <Badge className={cn('mt-1 text-[10px]', STATUS_CONFIG[selectedRecord.status]?.color)}>
                      {STATUS_CONFIG[selectedRecord.status]?.label}
                    </Badge>
                  </div>
                  {selectedRecord.followUpDate && (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Follow-up</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(selectedRecord.followUpDate), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Title</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedRecord.title}</p>
                </div>

                {selectedRecord.description && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRecord.description}</p>
                  </div>
                )}

                {selectedRecord.treatedBy && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Treated By</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRecord.treatedBy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ ADD CONDITION DIALOG ============ */}
      <AddConditionDialog
        open={addConditionOpen}
        onOpenChange={setAddConditionOpen}
        students={students}
        onSubmit={handleCreateCondition}
        loading={submitting}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        loadStudents={loadStudents}
      />

      {/* ============ EDIT CONDITION DIALOG ============ */}
      <EditConditionDialog
        open={editConditionOpen}
        onOpenChange={setEditConditionOpen}
        condition={editCondition}
        onSubmit={(data) => editCondition && handleUpdateCondition(editCondition.id, data)}
        loading={submitting}
      />

      {/* ============ DELETE CONFIRMATION ============ */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteType === 'record' ? 'Health Record' : 'Health Condition'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ ADD RECORD DIALOG ============

function AddRecordDialog({ open, onOpenChange, students, onSubmit, loading, studentSearch, setStudentSearch, loadStudents }: any) {
  const [form, setForm] = useState({
    studentId: '',
    recordType: '',
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    severity: 'MILD',
    status: 'RESOLVED',
    treatedBy: '',
    followUpDate: '',
  })

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
    if (v) {
      setForm({
        studentId: '',
        recordType: '',
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        severity: 'MILD',
        status: 'RESOLVED',
        treatedBy: '',
        followUpDate: '',
      })
      loadStudents(studentSearch)
    }
  }

  const handleSubmit = () => {
    if (!form.studentId || !form.recordType || !form.title) {
      toast.error('Please fill in student, record type, and title')
      return
    }
    onSubmit({
      ...form,
      followUpDate: form.followUpDate || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-600" />
            New Health Record
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — #{s.admissionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Record Type *</Label>
            <Select value={form.recordType} onValueChange={(v) => setForm({ ...form, recordType: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Annual Health Checkup" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details about the health record..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Treated By</Label>
            <Input value={form.treatedBy} onChange={(e) => setForm({ ...form, treatedBy: e.target.value })} placeholder="Doctor or nurse name" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ ADD CONDITION DIALOG ============

function AddConditionDialog({ open, onOpenChange, students, onSubmit, loading, studentSearch, setStudentSearch, loadStudents }: any) {
  const [form, setForm] = useState({
    studentId: '',
    condition: '',
    description: '',
    severity: 'MILD',
    isChronic: true,
    diagnosedDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
    if (v) {
      setForm({
        studentId: '',
        condition: '',
        description: '',
        severity: 'MILD',
        isChronic: true,
        diagnosedDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      })
      loadStudents(studentSearch)
    }
  }

  const handleSubmit = () => {
    if (!form.studentId || !form.condition) {
      toast.error('Please fill in student and condition')
      return
    }
    onSubmit(form)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Add Health Condition
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student *</Label>
            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — #{s.admissionNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condition *</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the condition..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diagnosed Date</Label>
              <Input type="date" value={form.diagnosedDate} onChange={(e) => setForm({ ...form, diagnosedDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Condition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ EDIT CONDITION DIALOG ============

function EditConditionDialog({ open, onOpenChange, condition, onSubmit, loading }: any) {
  const [form, setForm] = useState({
    condition: '',
    description: '',
    severity: 'MILD',
    isChronic: true,
    diagnosedDate: '',
    notes: '',
  })

  // Sync form when condition prop changes
  const formKey = condition?.id || ''
  if (condition && form.condition !== condition.condition) {
    setForm({
      condition: condition.condition,
      description: condition.description || '',
      severity: condition.severity || 'MILD',
      isChronic: condition.isChronic ?? true,
      diagnosedDate: condition.diagnosedDate ? format(new Date(condition.diagnosedDate), 'yyyy-MM-dd') : '',
      notes: condition.notes || '',
    })
  }

  const handleSubmit = () => {
    if (!form.condition) {
      toast.error('Condition is required')
      return
    }
    onSubmit({
      ...form,
      diagnosedDate: form.diagnosedDate || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-teal-600" />
            Edit Health Condition
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Diagnosed Date</Label>
              <Input type="date" value={form.diagnosedDate} onChange={(e) => setForm({ ...form, diagnosedDate: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
