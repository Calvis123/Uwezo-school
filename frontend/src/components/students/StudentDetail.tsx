'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, differenceInYears } from 'date-fns'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  Edit2,
  Copy,
  RefreshCw,
  KeyRound,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  FileText,
  MessageSquare,
  Users,
  Send,
  Award,
  BarChart3,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Smartphone,
  Landmark,
  Bus,
  HeartPulse,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { readJson } from '@/lib/read-json'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { studentsApi, feesApi, academicsApi, healthApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/avatar'
import { FINANCE_ROLES } from '@/lib/roles'

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null
  try {
    return differenceInYears(new Date(), new Date(dob))
  } catch {
    return null
  }
}

function getGradeColor(grade: string): string {
  const g = grade.toUpperCase()
  if (['A', 'EE', '1'].includes(g)) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  if (['B', 'ME', '2'].includes(g)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  if (['C', 'AE', '3'].includes(g)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function getGenderColor(gender: string): { bg: string; text: string } {
  if (gender === 'MALE') return { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' }
  if (gender === 'FEMALE') return { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' }
  return { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300' }
}

function getAvatarBg(gender: string): string {
  if (gender === 'MALE') return 'from-teal-500 to-teal-700'
  if (gender === 'FEMALE') return 'from-rose-500 to-rose-700'
  return 'from-slate-500 to-slate-700'
}

function getStudentTypeLabel(studentType: string | null | undefined): string {
  return studentType === 'BOARDING' ? 'Boarding' : 'Day Scholar'
}

function getTransportIdentity(
  transportInfo: any,
  studentType: string | null | undefined
): { label: string; className: string } {
  if (studentType === 'BOARDING') {
    return {
      label: 'Transport: N/A (Boarding)',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    }
  }

  const status = transportInfo?.status || 'UNPAID'
  if (status === 'ASSIGNED') {
    const busNumber = transportInfo?.bus?.busNumber
    return {
      label: busNumber ? `Transport: Bus ${busNumber}` : 'Transport: Bus Assigned',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    }
  }
  if (status === 'PAID_UNASSIGNED') {
    return {
      label: 'Transport: Paid - Pending Bus',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    }
  }
  return {
    label: 'Transport: Unpaid',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  INACTIVE: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  GRADUATED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  TRANSFERRED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const methodIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  MPESA: <Smartphone className="w-3.5 h-3.5" />,
  BANK: <Landmark className="w-3.5 h-3.5" />,
}

interface AcademicsData {
  overview: {
    averageScore: number
    totalExams: number
    totalSubjects: number
    bestSubject: { name: string; average: number; grade: string } | null
    worstSubject: { name: string; average: number; grade: string } | null
    attendanceRate: number
    overallGrade: string
  }
  quickStats?: {
    termLabel: string
    averageScore: number
    totalExams: number
    attendanceRate: number
    bestSubject: { name: string; average: number; grade: string } | null
    worstSubject: { name: string; average: number; grade: string } | null
    overallGrade: string
  }
  examHistory: Array<{
    examId: string
    examName: string
    term: string
    examType: string
    subjects: Array<{ subjectName: string; marks: number; grade: string; remarks: string }>
    totalMarks: number
    average: number
    grade: string
    rank?: number
    classSize?: number
  }>
  subjectPerformance: Array<{
    name: string
    average: number
    grade: string
    totalMarks: number
    examCount: number
  }>
  attendanceTrend: Array<{
    month: string
    rate: number
    present: number
    total: number
  }>
}

export function StudentDetail() {
  const { selectedStudentId, navigateTo, classes, user } = useAppStore()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [feeLedger, setFeeLedger] = useState<any>(null)
  const [academics, setAcademics] = useState<AcademicsData | null>(null)
  const [academicsLoading, setAcademicsLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [regenPinLoading, setRegenPinLoading] = useState(false)
  const [healthRecords, setHealthRecords] = useState<any[]>([])
  const [healthConditions, setHealthConditions] = useState<any[]>([])
  const [healthLoading, setHealthLoading] = useState(true)
  const canViewFeeTransport = user?.role !== 'TEACHER'
  const canRecordPayments = FINANCE_ROLES.includes((user?.role || '') as any)

  useEffect(() => {
    if (!selectedStudentId) return
    loadStudent()
  }, [selectedStudentId])

  const loadStudent = useCallback(async () => {
    if (!selectedStudentId) return
    setLoading(true)
    try {
      const res = await studentsApi.get(selectedStudentId)
      if (res.success && res.data) {
        setStudent(res.data)
      } else {
        setStudent(null)
      }
    } catch {
      setStudent(null)
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId])

  const loadFeeLedger = useCallback(async () => {
    if (!selectedStudentId) return
    try {
      const res = await feesApi.ledger(selectedStudentId)
      if (res.success && res.data) {
        setFeeLedger(res.data)
      }
    } catch {
      // silent
    }
  }, [selectedStudentId])

  const loadAcademics = useCallback(async () => {
    if (!selectedStudentId) return
    setAcademicsLoading(true)
    try {
      const res = await academicsApi.get(selectedStudentId)
      if (res.success && res.data) {
        setAcademics(res.data)
      }
    } catch {
      // silent
    } finally {
      setAcademicsLoading(false)
    }
  }, [selectedStudentId])

  const loadHealth = useCallback(async () => {
    if (!selectedStudentId) return
    setHealthLoading(true)
    try {
      const [recordsRes, conditionsRes] = await Promise.all([
        healthApi.records({ studentId: selectedStudentId, limit: 100 }),
        healthApi.conditions({ studentId: selectedStudentId, limit: 100 }),
      ])
      if (recordsRes.success) setHealthRecords(recordsRes.data || [])
      if (conditionsRes.success) setHealthConditions(conditionsRes.data || [])
    } catch {
      // silent
    } finally {
      setHealthLoading(false)
    }
  }, [selectedStudentId])

  useEffect(() => {
    if (student) {
      if (canViewFeeTransport) loadFeeLedger()
      loadAcademics()
      loadHealth()
    }
  }, [student, canViewFeeTransport, loadFeeLedger, loadAcademics, loadHealth])

  const handleCopyPin = () => {
    if (student?.resultsPin) {
      navigator.clipboard.writeText(student.resultsPin)
      toast.success('PIN copied to clipboard')
    }
  }

  const handleRegeneratePin = async () => {
    if (!selectedStudentId) return
    setRegenPinLoading(true)
    try {
      const res = await fetch(`/api/students/${selectedStudentId}/regenerate-pin`, {
        method: 'POST',
      })
      const data = await readJson<any>(res)
      if (data.success) {
        setStudent({ ...student, resultsPin: data.data.resultsPin })
        toast.success(`New PIN generated: ${data.data.resultsPin}`)
      } else {
        toast.error(data.error || 'Failed to regenerate PIN')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setRegenPinLoading(false)
    }
  }

  const handlePrintProfile = () => {
    window.print()
  }

  const handlePrintFeeStatement = () => {
    window.print()
  }

  const age = student?.dateOfBirth ? calculateAge(student.dateOfBirth) : null
  const genderColor = student?.gender ? getGenderColor(student.gender) : { bg: '', text: '' }
  const avatarGradient = student?.gender ? getAvatarBg(student.gender) : 'from-slate-500 to-slate-700'
  const studentTypeLabel = getStudentTypeLabel(student?.studentType)
  const transportIdentity = getTransportIdentity(student?.transportInfo, student?.studentType)
  const feePaid = feeLedger ? (feeLedger.totalPaid / Math.max(feeLedger.totalFees, 1)) * 100 : 0
  const quickStats = academics?.quickStats || academics?.overview

  if (loading) {
    return (
      <div className="space-y-4 print:hidden">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="text-center py-12 print:hidden">
        <p className="text-slate-500 dark:text-slate-400">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigateTo('students')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
        </Button>
      </div>
    )
  }

  const initials = getInitials(student.firstName, student.lastName)

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigateTo('students')} className="text-slate-500 dark:text-slate-400">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Students
        </Button>
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 print:shadow-none print:border print:border-slate-300" id="student-profile-print">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Large Avatar */}
              <div className={cn('h-20 w-20 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg', avatarGradient)}>
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {student.firstName} {student.lastName}
                  </h2>
                  <Badge className={cn('text-xs', statusColors[student.status] || '')}>
                    {student.status}
                  </Badge>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {student.admissionNumber} • {student.class?.name}{student.stream ? ` - Stream ${student.stream}` : ''}
                </p>

                <div className="flex flex-wrap gap-3 mt-3">
                  <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full', genderColor.bg, genderColor.text)}>
                    <User className="w-3.5 h-3.5" />
                    {student.gender === 'MALE' ? '♂ Male' : student.gender === 'FEMALE' ? '♀ Female' : student.gender}
                  </div>
                  {canViewFeeTransport && (
                    <>
                      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        <BookOpen className="w-3.5 h-3.5" />
                        {studentTypeLabel}
                      </div>
                      <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full', transportIdentity.className)}>
                        <Bus className="w-3.5 h-3.5" />
                        {transportIdentity.label.replace('Transport: ', '')}
                      </div>
                    </>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2.5 py-1 rounded-full">
                      <Calendar className="w-3.5 h-3.5" />
                      {age} years old
                    </div>
                  )}
                  {student.dateOfBirth && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(student.dateOfBirth), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => navigateTo('student-detail')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Student
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handlePrintProfile}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hidden Print Content */}
      <div className="hidden print:block" id="print-profile-content">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold">Uwezo School</h1>
          <p className="text-sm text-slate-600">Eldoret, Kenya</p>
          <p className="text-xs text-slate-500 mt-1">Student Profile Report</p>
        </div>

        <div className="flex items-start gap-6 mb-6">
          <div className={cn('h-24 w-24 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 mx-auto print:mx-0 border-4 border-slate-200', avatarGradient)}>
            <span className="text-3xl font-bold text-white">{initials}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold">{student.firstName} {student.lastName}</h2>
            <p className="text-sm text-slate-600">Admission #: {student.admissionNumber}</p>
            <p className="text-sm text-slate-600">Class: {student.class?.name}{student.stream ? ` - Stream ${student.stream}` : ''}</p>
            {canViewFeeTransport && (
              <>
                <p className="text-sm text-slate-600">Student Type: {studentTypeLabel}</p>
                <p className="text-sm text-slate-600">{transportIdentity.label}</p>
              </>
            )}
            <p className="text-sm text-slate-600">Status: {student.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div><span className="font-medium">Date of Birth:</span> {student.dateOfBirth ? format(new Date(student.dateOfBirth), 'MMM d, yyyy') : '—'}</div>
          <div><span className="font-medium">Gender:</span> {student.gender}</div>
          <div><span className="font-medium">Age:</span> {age !== null ? `${age} years` : '—'}</div>
          <div><span className="font-medium">Admission Date:</span> {format(new Date(student.admissionDate), 'MMM d, yyyy')}</div>
          <div className="col-span-2"><span className="font-medium">Address:</span> {student.address || '—'}</div>
        </div>

        {student.guardians?.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2 border-b pb-1">Guardian Information</h3>
            {student.guardians.map((g: any, i: number) => (
              <div key={i} className="text-sm mb-1">
                <span className="font-medium">{g.guardian?.name}</span> — {g.relationship} {g.isPrimary && '(Primary)'}
                {g.guardian?.phone && <span className="ml-2">📞 {g.guardian.phone}</span>}
                {g.guardian?.email && <span className="ml-2">✉ {g.guardian.email}</span>}
              </div>
            ))}
          </div>
        )}

        {academics && (
          <div className="mb-6">
            <h3 className="font-semibold text-sm mb-2 border-b pb-1">Academic Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="font-medium">Average Score:</span> {academics.overview.averageScore}</div>
              <div><span className="font-medium">Total Exams:</span> {academics.overview.totalExams}</div>
              <div><span className="font-medium">Attendance Rate:</span> {academics.overview.attendanceRate}%</div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-400 mt-8 border-t pt-4">
          Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')} — Uwezo School Management System
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="print:hidden">
        <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto min-w-max">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="academics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Academics
          </TabsTrigger>
          <TabsTrigger value="communication" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Communication
          </TabsTrigger>
          {canViewFeeTransport && (
            <>
              <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
                Documents
              </TabsTrigger>
              <TabsTrigger value="fees" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
                Fees
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm">
            Health
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Info */}
            <Card className="bg-white dark:bg-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Results PIN */}
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 -mx-1 border border-teal-100 dark:border-teal-800/40">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">Results PIN</span>
                  </div>
                  {student.resultsPin ? (
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono font-bold text-teal-800 dark:text-teal-200 tracking-widest">
                        {student.resultsPin}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600 hover:text-teal-700 hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-teal-900/40" onClick={handleCopyPin} title="Copy PIN">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40" onClick={handleRegeneratePin} disabled={regenPinLoading} title="Regenerate PIN">
                          <RefreshCw className={cn('w-3.5 h-3.5', regenPinLoading && 'animate-spin')} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-teal-600/60 dark:text-teal-400/60">No PIN assigned</span>
                      <Button variant="ghost" size="sm" className="h-7 text-teal-600 hover:text-teal-700 hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-teal-900/40 text-xs btn-press" onClick={handleRegeneratePin} disabled={regenPinLoading}>
                        {regenPinLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1" />}
                        Generate PIN
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Date of Birth</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.dateOfBirth ? format(new Date(student.dateOfBirth), 'MMM d, yyyy') : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Age</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{age !== null ? `${age} years` : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Gender</span>
                  <span className={cn('font-medium px-2 py-0.5 rounded text-xs', genderColor.bg, genderColor.text)}>
                    {student.gender}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Class</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.class?.name}{student.stream ? ` - Stream ${student.stream}` : ''}</span>
                </div>
                {canViewFeeTransport && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Student Type</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{studentTypeLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Transport</span>
                      <span className={cn('font-medium px-2 py-0.5 rounded text-xs', transportIdentity.className)}>
                        {transportIdentity.label.replace('Transport: ', '')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Admission Date</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{format(new Date(student.admissionDate), 'MMM d, yyyy')}</span>
                </div>
                {student.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Address</span>
                    <span className="font-medium text-right max-w-[60%] text-slate-900 dark:text-slate-100">{student.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white dark:bg-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Stats</CardTitle>
                  {academics?.quickStats?.termLabel && (
                    <Badge variant="secondary" className="text-[10px]">
                      {academics.quickStats.termLabel}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" /> Average Score
                  </span>
                  <span className={cn('text-sm font-bold', getScoreColor(quickStats?.averageScore || 0))}>
                    {quickStats?.averageScore?.toFixed(1) || '—'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-green-500" /> Attendance
                  </span>
                  <span className={cn('text-sm font-bold', getScoreColor(quickStats?.attendanceRate || 0))}>
                    {quickStats?.attendanceRate?.toFixed(1) || '—'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" /> Total Exams
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {quickStats?.totalExams || 0}
                  </span>
                </div>
                {canViewFeeTransport && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-500" /> Fee Balance
                    </span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      KES {feeLedger?.balance?.toLocaleString() || student.feeSummary?.outstanding?.toLocaleString() || '0'}
                    </span>
                  </div>
                )}
                {quickStats?.bestSubject && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" /> Best Subject
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {quickStats.bestSubject.name} ({quickStats.bestSubject.average})
                    </span>
                  </div>
                )}
                {quickStats?.worstSubject && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" /> Needs Improvement
                    </span>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {quickStats.worstSubject.name} ({quickStats.worstSubject.average})
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card className="bg-white dark:bg-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Medical Notes</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.medicalNotes || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Allergies</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{student.allergies || 'None'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Parent / Guardian Info */}
            <Card className="bg-white dark:bg-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Parent / Guardian Details</CardTitle>
              </CardHeader>
              <CardContent>
                {student.parentDetails?.length > 0 ? (
                  <div className="space-y-3">
                    {student.parentDetails.map((parent: any, index: number) => (
                      <div key={parent.id || index} className="rounded-lg border border-slate-200/70 dark:border-slate-700/60 p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{parent.name || 'Unnamed guardian'}</p>
                          <Badge variant="secondary" className="text-[10px]">{parent.relationship || 'GUARDIAN'}</Badge>
                          {parent.isPrimary && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{parent.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{parent.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">No parent/guardian linked yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academics Tab */}
        <TabsContent value="academics" className="mt-4 space-y-4">
          {academicsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : academics ? (
            <>
              {/* Performance Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Score</p>
                    <p className={cn('text-2xl font-bold', getScoreColor(academics.overview.averageScore))}>
                      {academics.overview.averageScore.toFixed(1)}
                    </p>
                    <Badge className={cn('mt-1 text-[10px]', getGradeColor(academics.overview.overallGrade))}>
                      {academics.overview.overallGrade}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Exams</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{academics.overview.totalExams}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Best Subject</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                      {academics.overview.bestSubject?.name || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Worst Subject</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mt-1">
                      {academics.overview.worstSubject?.name || '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Attendance</p>
                    <p className={cn('text-2xl font-bold', getScoreColor(academics.overview.attendanceRate))}>
                      {academics.overview.attendanceRate.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Subject Performance - Horizontal Bar Chart */}
              {academics.subjectPerformance.length > 0 && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-600" />
                      Subject Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {academics.subjectPerformance.map((subject) => (
                        <div key={subject.name} className="flex items-center gap-3">
                          <span className="text-xs text-slate-700 dark:text-slate-300 w-28 truncate font-medium flex-shrink-0">
                            {subject.name}
                          </span>
                          <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700/50 rounded-md overflow-hidden relative">
                            <div
                              className={cn('h-full rounded-md transition-all duration-500', getBarColor(subject.average))}
                              style={{ width: `${Math.min(subject.average, 100)}%` }}
                            />
                          </div>
                          <span className={cn('text-xs font-bold w-10 text-right tabular-nums', getScoreColor(subject.average))}>
                            {subject.average.toFixed(1)}
                          </span>
                          <Badge className={cn('text-[10px] w-8 justify-center', getGradeColor(subject.grade))}>
                            {subject.grade}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Exam History */}
              <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exam History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Exam</TableHead>
                          <TableHead className="text-xs">Term</TableHead>
                          <TableHead className="text-xs">Subjects</TableHead>
                          <TableHead className="text-xs">Average</TableHead>
                          <TableHead className="text-xs">Grade</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Rank</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {academics.examHistory.map((exam, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{exam.examName}</TableCell>
                            <TableCell className="text-sm text-slate-500">{exam.term}</TableCell>
                            <TableCell className="text-sm text-slate-500">{exam.subjects.length}</TableCell>
                            <TableCell className={cn('text-sm font-semibold', getScoreColor(exam.average))}>
                              {exam.average.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn('text-[10px]', getGradeColor(exam.grade))}>{exam.grade}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                              {exam.rank ? `${exam.rank}/${exam.classSize}` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {academics.examHistory.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-slate-400 py-8">
                              No exam results found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Trend */}
              {academics.attendanceTrend.length > 0 && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                      Attendance Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {academics.attendanceTrend.map((item) => (
                        <div key={item.month} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.month}</span>
                            <span className={cn('text-xs font-bold', getScoreColor(item.rate))}>{item.rate}%</span>
                          </div>
                          <Progress value={item.rate} className="h-1.5" />
                          <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                            <span>{item.present} present</span>
                            <span>{item.total - item.present} absent</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-white dark:bg-slate-800">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No academic data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="mt-4 space-y-4">
          <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Linked Guardians
                </CardTitle>
                <span className="text-xs text-slate-400 dark:text-slate-500">{student.guardians?.length || 0} guardians</span>
              </div>
            </CardHeader>
            <CardContent>
              {student.guardians?.length > 0 ? (
                <div className="space-y-3">
                  {student.guardians.map((g: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white">
                          {g.guardian?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{g.guardian?.name}</p>
                          <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                            {g.relationship}
                          </Badge>
                          {g.isPrimary && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2">
                          {g.guardian?.phone && (
                            <a href={`tel:${g.guardian.phone}`} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                              {g.guardian.phone}
                            </a>
                          )}
                          {g.guardian?.email && (
                            <a href={`mailto:${g.guardian.email}`} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                              <Mail className="w-3.5 h-3.5" />
                              {g.guardian.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 gap-1.5 flex-shrink-0"
                        onClick={() => navigateTo('messages')}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Message</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No guardian information linked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewFeeTransport && (
          <>
        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* Fee Payment History */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Fee Payment History
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={handlePrintFeeStatement}
                >
                  <Printer className="w-3 h-3" />
                  Print Statement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Fee Summary Mini */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Fees</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    KES {(feeLedger?.totalFees || student.feeSummary?.totalFees || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Paid</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    KES {(feeLedger?.totalPaid || student.feeSummary?.totalPaid || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Outstanding</p>
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    KES {(feeLedger?.balance || student.feeSummary?.outstanding || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Receipt #</TableHead>
                      <TableHead className="text-xs">Fee Type</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Method</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(student.feeTransactions || []).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm font-mono">{t.receiptNumber}</TableCell>
                        <TableCell className="text-sm">{t.feeStructure?.name || '—'}</TableCell>
                        <TableCell className="text-sm font-semibold">KES {t.amount?.toLocaleString()}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-1 w-fit">
                            {methodIcons[t.paymentMethod] || <Banknote className="w-3 h-3" />}
                            {t.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                          {format(new Date(t.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!student.feeTransactions || student.feeTransactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-slate-400 py-8">
                          No payment transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-slate-800 card-interactive">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Fees</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">KES {(feeLedger?.totalFees || student.feeSummary?.totalFees || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 card-interactive">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Paid</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">KES {(feeLedger?.totalPaid || student.feeSummary?.totalPaid || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 card-interactive">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Balance</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">KES {(feeLedger?.balance || student.feeSummary?.outstanding || 0).toLocaleString()}</p>
                {feeLedger && (
                  <Progress value={feePaid} className="mt-2 h-2" />
                )}
              </CardContent>
            </Card>
          </div>

          {canRecordPayments && (
            <div className="flex justify-end">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white btn-press" onClick={() => setPaymentDialogOpen(true)}>
                <DollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </div>
          )}

          {/* Record Payment Dialog */}
          <Dialog open={canRecordPayments && paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder="Enter amount" id="pay-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                      <SelectItem value="BANK">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Optional notes" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={async () => {
                    const amountEl = document.getElementById('pay-amount') as HTMLInputElement
                    if (!amountEl?.value || Number(amountEl.value) <= 0) {
                      toast.error('Please enter a valid amount')
                      return
                    }
                    setPayLoading(true)
                    try {
                      const result = await feesApi.createTransaction({
                        studentId: selectedStudentId,
                        feeStructureId: feeLedger?.structures?.[0]?.id,
                        amount: Number(amountEl.value),
                        paymentMethod: 'CASH',
                      })
                      if (result.success) {
                        toast.success('Payment recorded successfully')
                        setPaymentDialogOpen(false)
                        loadStudent()
                        loadFeeLedger()
                      } else {
                        toast.error(result.error || 'Failed to record payment')
                      }
                    } catch {
                      toast.error('An error occurred')
                    } finally {
                      setPayLoading(false)
                    }
                  }}
                  disabled={payLoading}
                >
                  {payLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
          </>
        )}

        {/* Health Tab */}
        <TabsContent value="health" className="mt-4 space-y-4">
          {healthLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Health Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Active Conditions</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {healthConditions.filter((c: any) => c.isChronic).length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-teal-500" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Records</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {healthRecords.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-sky-500" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">Last Checkup</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {(() => {
                        const checkup = [...healthRecords].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).find((r: any) => r.recordType === 'CHECKUP' || r.recordType === 'DENTAL' || r.recordType === 'EYE_EXAM')
                        return checkup ? format(new Date(checkup.date), 'MMM d, yyyy') : 'None'
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Conditions */}
              {healthConditions.length > 0 && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-teal-600" />
                      Chronic Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {healthConditions.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-2 h-2 rounded-full', c.severity === 'SEVERE' ? 'bg-red-500' : c.severity === 'MODERATE' ? 'bg-amber-500' : 'bg-green-500')} />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.condition.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{c.description ? (c.description.length > 60 ? c.description.slice(0, 60) + '...' : c.description) : 'No description'}</p>
                            </div>
                          </div>
                          <Badge variant={c.isChronic ? 'default' : 'secondary'} className="text-[10px]">
                            {c.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Health Records */}
              <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-teal-600" />
                      Recent Health Records
                    </CardTitle>
                    <span className="text-xs text-slate-400">{healthRecords.length} records</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {healthRecords.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Title</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Severity</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {healthRecords.slice(0, 5).map((r: any) => {
                            const severityConfig: Record<string, { dot: string; label: string }> = {
                              MILD: { dot: 'bg-green-500', label: 'Mild' },
                              MODERATE: { dot: 'bg-amber-500', label: 'Moderate' },
                              SEVERE: { dot: 'bg-red-500', label: 'Severe' },
                              CRITICAL: { dot: 'bg-rose-500', label: 'Critical' },
                            }
                            const statusConfig: Record<string, { color: string; label: string }> = {
                              ACTIVE: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Active' },
                              RESOLVED: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', label: 'Resolved' },
                              ONGOING: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Ongoing' },
                              MONITORING: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', label: 'Monitoring' },
                            }
                            const typeConfig: Record<string, { color: string; label: string }> = {
                              ALLERGY: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', label: 'Allergy' },
                              ILLNESS: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Illness' },
                              INJURY: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Injury' },
                              CHECKUP: { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300', label: 'Checkup' },
                              VACCINATION: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Vaccination' },
                              DENTAL: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Dental' },
                              EYE_EXAM: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', label: 'Eye Exam' },
                              SPECIAL_NEED: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', label: 'Special Need' },
                            }
                            const tc = typeConfig[r.recordType] || { color: 'bg-slate-100 text-slate-700', label: r.recordType }
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs text-slate-500">{format(new Date(r.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell><Badge className={cn('text-[10px]', tc.color)}>{tc.label}</Badge></TableCell>
                                <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn('w-1.5 h-1.5 rounded-full', severityConfig[r.severity]?.dot)} />
                                    <span className="text-xs text-slate-500">{severityConfig[r.severity]?.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge className={cn('text-[10px]', statusConfig[r.status]?.color)}>{statusConfig[r.status]?.label}</Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <HeartPulse className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No health records found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* View Full Health Records Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-teal-200 dark:border-teal-800"
                  onClick={() => navigateTo('health')}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full Health Records
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
