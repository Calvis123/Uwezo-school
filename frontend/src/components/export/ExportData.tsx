'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download,
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  Users,
  Database,
  BookOpenCheck,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface ExportCardConfig {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  darkBgColor: string
  borderColor: string
}

const exportCards: ExportCardConfig[] = [
  {
    id: 'academic',
    title: 'Academic & DOS Reports',
    description: 'Export performance, exam results, class rankings, teacher reports, attendance summaries, timetables, and follow-up lists.',
    icon: BookOpenCheck,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    id: 'students',
    title: 'Student Data',
    description: 'Export student list with admission details, class, gender, status, and parent contacts.',
    icon: GraduationCap,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    id: 'fees',
    title: 'Finance Reports',
    description: 'Export fee payments, outstanding balances, and daily/weekly/monthly collection summaries.',
    icon: DollarSign,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    id: 'attendance',
    title: 'Attendance Records',
    description: 'Export monthly attendance data with present, absent, late days, and attendance rates.',
    icon: ClipboardCheck,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/30',
    borderColor: 'border-sky-200 dark:border-sky-800',
  },
]

export function ExportData() {
  const { classes, setClasses, user } = useAppStore()
  const isBursar = user?.role === 'BURSAR'
  const isHeadteacher = user?.role === 'HEADTEACHER'
  const isSecretary = user?.role === 'SECRETARY'
  const isDos = user?.role === 'DOS'
  const [localClasses, setLocalClasses] = useState(classes)

  // Filters
  const [studentClassFilter, setStudentClassFilter] = useState('all')
  const [studentStatusFilter, setStudentStatusFilter] = useState('all')
  const [feeClassFilter, setFeeClassFilter] = useState('all')
  const [feeStartDate, setFeeStartDate] = useState('')
  const [feeEndDate, setFeeEndDate] = useState('')
  const [feeReportType, setFeeReportType] = useState<
    | 'transactions'
    | 'outstanding'
    | 'transport-paid-students'
    | 'fee-arrears-students'
    | 'summary'
    | 'statements'
    | 'management-summary'
    | 'total-collections'
    | 'monthly-income'
    | 'mpesa-summary'
    | 'bank-reconciliation'
    | 'expense-summary'
    | 'budget-report'
  >(
    isSecretary ? 'statements' : isHeadteacher ? 'summary' : 'transactions'
  )
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('')
  const [attendanceMonth, setAttendanceMonth] = useState(String(new Date().getMonth() + 1))
  const [attendanceYear, setAttendanceYear] = useState(String(new Date().getFullYear()))
  const [academicClassFilter, setAcademicClassFilter] = useState('all')
  const [academicReportType, setAcademicReportType] = useState<
    | 'student-performance'
    | 'exam-results'
    | 'class-performance'
    | 'whole-school-performance'
    | 'subject-performance'
    | 'student-rankings'
    | 'national-internal-analysis'
    | 'teacher-performance'
    | 'attendance-summary'
    | 'staff-attendance'
    | 'staff-management'
    | 'admissions-enrollment'
    | 'discipline-welfare'
    | 'timetable'
    | 'follow-up'
  >('student-performance')
  const [exportFormat, setExportFormat] = useState<'csv' | 'xls' | 'pdf'>('csv')

  // Record counts
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [feeCount, setFeeCount] = useState<number | null>(null)
  const [attendanceCount, setAttendanceCount] = useState<number | null>(null)
  const [academicCount, setAcademicCount] = useState<number | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(true)

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

  const loadCounts = useCallback(async () => {
    setLoadingCounts(true)
    try {
      // Fetch student count
      if (!isBursar && !isSecretary) {
        const studentParams = new URLSearchParams()
        if (studentClassFilter !== 'all') studentParams.set('classId', studentClassFilter)
        if (studentStatusFilter !== 'all') studentParams.set('status', studentStatusFilter)
        studentParams.set('format', 'csv')
        const studentRes = await fetch(`/api/export/students?${studentParams.toString()}`)
        if (studentRes.ok) {
          const csv = await studentRes.text()
          const lines = csv.split('\n').filter((l) => l.trim())
          setStudentCount(Math.max(0, lines.length - 1))
        } else {
          setStudentCount(0)
        }
      } else {
        setStudentCount(0)
      }

      // Fetch fee count
      if (!isDos) {
        const feeParams = new URLSearchParams()
        if (feeClassFilter !== 'all') feeParams.set('classId', feeClassFilter)
        if (feeStartDate) feeParams.set('startDate', feeStartDate)
        if (feeEndDate) feeParams.set('endDate', feeEndDate)
        feeParams.set('reportType', feeReportType)
        feeParams.set('format', 'csv')
        const feeRes = await fetch(`/api/export/fees?${feeParams.toString()}`)
        if (feeRes.ok) {
          const csv = await feeRes.text()
          const lines = csv.split('\n').filter((l) => l.trim())
          setFeeCount(Math.max(0, lines.length - 1))
        } else {
          setFeeCount(0)
        }
      } else {
        setFeeCount(0)
      }

      // Fetch attendance count
      if (!isBursar && !isSecretary && attendanceClassFilter && attendanceClassFilter !== 'all') {
        const attParams = new URLSearchParams()
        attParams.set('classId', attendanceClassFilter)
        attParams.set('month', attendanceMonth)
        attParams.set('year', attendanceYear)
        attParams.set('format', 'csv')
        const attRes = await fetch(`/api/export/attendance?${attParams.toString()}`)
        if (attRes.ok) {
          const csv = await attRes.text()
          const lines = csv.split('\n').filter((l) => l.trim())
          setAttendanceCount(Math.max(0, lines.length - 1))
        }
      } else {
        setAttendanceCount(0)
      }

      // Fetch academic count
      if (!isBursar && !isSecretary) {
        const academicParams = new URLSearchParams()
        if (academicClassFilter !== 'all') academicParams.set('classId', academicClassFilter)
        academicParams.set('reportType', academicReportType)
        academicParams.set('format', 'csv')
        const academicRes = await fetch(`/api/export/academic?${academicParams.toString()}`)
        if (academicRes.ok) {
          const csv = await academicRes.text()
          const lines = csv.split('\n').filter((l) => l.trim())
          setAcademicCount(Math.max(0, lines.length - 1))
        } else {
          setAcademicCount(0)
        }
      } else {
        setAcademicCount(0)
      }
    } catch {
      // Silently fail count loading
    } finally {
      setLoadingCounts(false)
    }
  }, [studentClassFilter, studentStatusFilter, feeClassFilter, feeStartDate, feeEndDate, feeReportType, attendanceClassFilter, attendanceMonth, attendanceYear, academicClassFilter, academicReportType, isBursar, isSecretary, isDos])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  useEffect(() => {
    if (isHeadteacher && feeReportType === 'transactions') {
      setFeeReportType('summary')
    }
    if (isSecretary && feeReportType !== 'statements') {
      setFeeReportType('statements')
    }
  }, [isHeadteacher, isSecretary, feeReportType])

  const handleExport = (type: string) => {
    let url = ''
    switch (type) {
      case 'academic':
        url = `/api/export/academic?classId=${academicClassFilter}&format=${exportFormat}&reportType=${academicReportType}`
        break
      case 'students':
        url = `/api/export/students?classId=${studentClassFilter}&status=${studentStatusFilter}&format=${exportFormat}`
        break
      case 'fees':
        url = `/api/export/fees?classId=${feeClassFilter}&format=${exportFormat}`
        url += `&reportType=${feeReportType}`
        if (feeStartDate) url += `&startDate=${feeStartDate}`
        if (feeEndDate) url += `&endDate=${feeEndDate}`
        break
      case 'attendance':
        if (!attendanceClassFilter || attendanceClassFilter === 'all') return
        url = `/api/export/attendance?classId=${attendanceClassFilter}&month=${attendanceMonth}&year=${attendanceYear}&format=${exportFormat}`
        break
    }
    if (url) window.open(url, '_blank')
  }

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ]

  const formatLabel = exportFormat === 'csv' ? 'CSV' : exportFormat === 'xls' ? 'Excel' : 'PDF'
  const visibleCards = isBursar || isSecretary
    ? exportCards.filter((card) => card.id === 'fees')
    : isDos
    ? exportCards.filter((card) => card.id !== 'fees')
    : exportCards
  const feeReportOptions = isSecretary
    ? [{ value: 'statements', label: 'Fee Statements' }]
    : isHeadteacher
    ? [
        { value: 'management-summary', label: 'Headteacher Financial Summary' },
        { value: 'total-collections', label: 'Total Fee Collections' },
        { value: 'outstanding', label: 'Outstanding Balances' },
        { value: 'fee-arrears-students', label: 'Students with Fee Arrears' },
        { value: 'monthly-income', label: 'Monthly Income Report' },
        { value: 'mpesa-summary', label: 'M-Pesa Payment Summary' },
        { value: 'bank-reconciliation', label: 'Bank Reconciliation Summary' },
        { value: 'expense-summary', label: 'Expense Summary' },
        { value: 'budget-report', label: 'Budget Report' },
        { value: 'summary', label: 'Collections Summary (Daily/Weekly/Monthly)' },
      ]
    : [
        { value: 'transactions', label: 'Fee Payment Report' },
        { value: 'outstanding', label: 'Outstanding Balances' },
        { value: 'transport-paid-students', label: 'Students Who Paid Transport Fee' },
        { value: 'fee-arrears-students', label: 'Students with Fee Arrears' },
        { value: 'summary', label: 'Collections Summary (Daily/Weekly/Monthly)' },
      ]
  const feeReportContext: Record<string, string> = {
    transactions:
      'Detailed receipt-level payment records by student, class, amount, payment method, and transaction reference.',
    outstanding:
      'Term-based outstanding balances showing expected fees, paid totals, and remaining balances per student.',
    'transport-paid-students':
      'Students with at least one completed transport-fee payment in the selected period and class scope.',
    'fee-arrears-students':
      'Active students with carried-forward arrears from previous terms or years plus any current-term balance.',
    summary:
      'Consolidated daily, weekly, and monthly collections for quick finance trend monitoring.',
    statements:
      'Student fee statement lines for parent communication and official account reconciliation.',
    'management-summary':
      'Executive finance view for leadership covering collections, balances, and payment channel performance.',
    'total-collections':
      'Single-line total collections summary for the selected class/date filters.',
    'monthly-income':
      'Month-by-month income totals with transaction counts and average ticket size.',
    'mpesa-summary':
      'M-Pesa-specific collection performance grouped by month.',
    'bank-reconciliation':
      'Bank-channel collections and summary variance indicators for reconciliation support.',
    'expense-summary':
      'Expense summary placeholder. Use once expense ledger records are enabled.',
    'budget-report':
      'Budget summary placeholder. Use once budget planning records are enabled.',
  }
  const academicReportOptions = isDos
    ? [
        { value: 'student-performance', label: 'Student Academic Performance' },
        { value: 'exam-results', label: 'Exam Results' },
        { value: 'class-performance', label: 'Class Performance Rankings' },
        { value: 'teacher-performance', label: 'Teacher Performance' },
        { value: 'attendance-summary', label: 'Attendance Summary' },
        { value: 'timetable', label: 'Timetable Export' },
        { value: 'follow-up', label: 'Discipline & Academic Follow-up' },
      ]
    : isHeadteacher
    ? [
        { value: 'whole-school-performance', label: 'Whole-School Exam Performance' },
        { value: 'class-performance', label: 'Class Performance Summaries' },
        { value: 'national-internal-analysis', label: 'KCPE / KCSE / Internal Exam Analysis' },
        { value: 'subject-performance', label: 'Subject Performance Reports' },
        { value: 'student-rankings', label: 'Student Ranking Summaries' },
        { value: 'attendance-summary', label: 'Student Attendance Summaries' },
        { value: 'staff-attendance', label: 'Teacher Attendance Reports' },
        { value: 'staff-management', label: 'Staff Management Reports' },
        { value: 'admissions-enrollment', label: 'Admission & Enrollment Reports' },
        { value: 'discipline-welfare', label: 'Discipline & Welfare Reports' },
      ]
    : [
        { value: 'student-performance', label: 'Student Academic Performance' },
        { value: 'exam-results', label: 'Exam Results' },
        { value: 'class-performance', label: 'Class Performance Rankings' },
        { value: 'teacher-performance', label: 'Teacher Performance' },
        { value: 'attendance-summary', label: 'Student Attendance Summary' },
        { value: 'staff-attendance', label: 'Teacher/Staff Attendance Report' },
        { value: 'staff-management', label: 'Staff Management Report' },
        { value: 'admissions-enrollment', label: 'Admission & Enrollment Report' },
        { value: 'discipline-welfare', label: 'Discipline & Welfare Report' },
        { value: 'timetable', label: 'Timetable Export' },
        { value: 'follow-up', label: 'Discipline & Academic Follow-up' },
      ]
  const exportTypeCount = isBursar || isSecretary ? feeReportOptions.length : isDos ? academicReportOptions.length : exportCards.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-sm dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {isBursar || isSecretary ? 'Finance Export Center' : isDos ? 'DOS Export Center' : 'School Data Export Center'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300 max-w-4xl">
            {isBursar
              ? 'Generate bursar-ready exports for collections, transport fee payments, arrears follow-up, and financial performance tracking.'
              : isSecretary
              ? 'Export printable fee statements for students and parents.'
              : isDos
              ? 'Export academic performance, exam summaries, attendance summaries, timetables, and follow-up reports.'
              : 'Export school data for reporting and analysis.'}
          </p>
        </div>
        <div className="w-full sm:w-[200px]">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Export Format</label>
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as any)}>
            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xls">Excel (.xls)</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Classes</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{localClasses.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-sm border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Export Types</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{exportTypeCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm border-slate-200/70 dark:border-slate-700/70 bg-white dark:bg-slate-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Format</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatLabel}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Export Cards */}
      <div className="space-y-4">
        {visibleCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
            >
              <Card className={`shadow-sm transition-all duration-200 hover:shadow-md ${card.borderColor} bg-white dark:bg-slate-800 overflow-hidden`}>
                <CardHeader className={`pb-3 border-b ${card.borderColor} ${card.bgColor}/40`}>
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {card.title}
                      </CardTitle>
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 mt-1">
                        {card.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-semibold border border-slate-200/80 dark:border-slate-600/70">
                      {card.id === 'fees'
                        ? `${feeReportOptions.length} report types`
                        : card.id === 'academic'
                        ? `${academicReportOptions.length} report types`
                        : 'Filtered export'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 bg-slate-50/60 dark:bg-slate-900/30">
                    {/* Academic (DOS) filters */}
                    {card.id === 'academic' && (
                      <>
                        <div className="flex-1 w-full sm:max-w-[280px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Report Type</label>
                          <Select value={academicReportType} onValueChange={(v) => setAcademicReportType(v as any)}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {academicReportOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                          <Select value={academicClassFilter} onValueChange={setAcademicClassFilter}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Classes</SelectItem>
                              {localClasses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Students filters */}
                    {card.id === 'students' && (
                      <>
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                          <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Classes</SelectItem>
                              {localClasses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[180px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
                          <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="ACTIVE">Active</SelectItem>
                              <SelectItem value="INACTIVE">Inactive</SelectItem>
                              <SelectItem value="GRADUATED">Graduated</SelectItem>
                              <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Fees filters */}
                    {card.id === 'fees' && (
                      <>
                        <div className="flex-1 w-full sm:max-w-[260px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Report Type</label>
                          <Select value={feeReportType} onValueChange={(v) => setFeeReportType(v as any)}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {feeReportOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                          <Select value={feeClassFilter} onValueChange={setFeeClassFilter}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Classes</SelectItem>
                              {localClasses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[180px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Start Date</label>
                          <Input
                            type="date"
                            className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600"
                            value={feeStartDate}
                            onChange={(e) => setFeeStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 w-full sm:max-w-[180px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">End Date</label>
                          <Input
                            type="date"
                            className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600"
                            value={feeEndDate}
                            onChange={(e) => setFeeEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* Attendance filters */}
                    {card.id === 'attendance' && (
                      <>
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class <span className="text-red-500">*</span></label>
                          <Select value={attendanceClassFilter} onValueChange={setAttendanceClassFilter}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {localClasses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[160px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Month</label>
                          <Select value={attendanceMonth} onValueChange={setAttendanceMonth}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 w-full sm:max-w-[120px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Year</label>
                          <Select value={attendanceYear} onValueChange={setAttendanceYear}>
                            <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300/90 dark:border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Record count & Download */}
                    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3 sm:ml-auto rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 px-3 py-2">
                      <div className="text-left sm:text-right min-w-[64px]">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Records</p>
                        {loadingCounts ? (
                          <Skeleton className="h-5 w-12 mt-0.5" />
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {card.id === 'students' && (studentCount ?? '-')}
                            {card.id === 'academic' && (academicCount ?? '-')}
                            {card.id === 'fees' && (feeCount ?? '-')}
                            {card.id === 'attendance' && (attendanceCount ?? '-')}
                          </p>
                        )}
                      </div>
                      <Button
                        className={`h-10 gap-2 text-white shadow-sm font-medium ${
                          card.id === 'students'
                            ? 'bg-teal-600 hover:bg-teal-700'
                            : card.id === 'academic'
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : card.id === 'fees'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-sky-600 hover:bg-sky-700'
                        } w-full sm:w-auto ${card.id === 'attendance' && (!attendanceClassFilter || attendanceClassFilter === 'all') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleExport(card.id)}
                        disabled={card.id === 'attendance' && (!attendanceClassFilter || attendanceClassFilter === 'all')}
                      >
                        <Download className="w-4 h-4" />
                        Download {formatLabel}
                      </Button>
                    </div>
                  </div>
                  {card.id === 'fees' && (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Report Context
                      </p>
                      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                        {feeReportContext[feeReportType] || 'Export data using the selected filters and report type.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

    </div>
  )
}

