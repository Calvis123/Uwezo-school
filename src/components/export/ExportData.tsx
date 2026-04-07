'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Download,
  GraduationCap,
  DollarSign,
  ClipboardCheck,
  Users,
  Database,
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
    title: 'Fee Transactions',
    description: 'Export fee payment records including student info, amounts, methods, and receipt numbers.',
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
  const { classes, setClasses } = useAppStore()
  const [localClasses, setLocalClasses] = useState(classes)

  // Filters
  const [studentClassFilter, setStudentClassFilter] = useState('all')
  const [studentStatusFilter, setStudentStatusFilter] = useState('all')
  const [feeClassFilter, setFeeClassFilter] = useState('all')
  const [feeStartDate, setFeeStartDate] = useState('')
  const [feeEndDate, setFeeEndDate] = useState('')
  const [attendanceClassFilter, setAttendanceClassFilter] = useState('')
  const [attendanceMonth, setAttendanceMonth] = useState(String(new Date().getMonth() + 1))
  const [attendanceYear, setAttendanceYear] = useState(String(new Date().getFullYear()))

  // Record counts
  const [studentCount, setStudentCount] = useState<number | null>(null)
  const [feeCount, setFeeCount] = useState<number | null>(null)
  const [attendanceCount, setAttendanceCount] = useState<number | null>(null)
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
      const studentParams = new URLSearchParams()
      if (studentClassFilter !== 'all') studentParams.set('classId', studentClassFilter)
      if (studentStatusFilter !== 'all') studentParams.set('status', studentStatusFilter)
      const studentRes = await fetch(`/api/export/students?${studentParams.toString()}`)
      if (studentRes.ok) {
        const csv = await studentRes.text()
        const lines = csv.split('\n').filter((l) => l.trim())
        setStudentCount(Math.max(0, lines.length - 1))
      }

      // Fetch fee count
      const feeParams = new URLSearchParams()
      if (feeClassFilter !== 'all') feeParams.set('classId', feeClassFilter)
      if (feeStartDate) feeParams.set('startDate', feeStartDate)
      if (feeEndDate) feeParams.set('endDate', feeEndDate)
      const feeRes = await fetch(`/api/export/fees?${feeParams.toString()}`)
      if (feeRes.ok) {
        const csv = await feeRes.text()
        const lines = csv.split('\n').filter((l) => l.trim())
        setFeeCount(Math.max(0, lines.length - 1))
      }

      // Fetch attendance count
      if (attendanceClassFilter && attendanceClassFilter !== 'all') {
        const attParams = new URLSearchParams()
        attParams.set('classId', attendanceClassFilter)
        attParams.set('month', attendanceMonth)
        attParams.set('year', attendanceYear)
        const attRes = await fetch(`/api/export/attendance?${attParams.toString()}`)
        if (attRes.ok) {
          const csv = await attRes.text()
          const lines = csv.split('\n').filter((l) => l.trim())
          setAttendanceCount(Math.max(0, lines.length - 1))
        }
      } else {
        setAttendanceCount(0)
      }
    } catch {
      // Silently fail count loading
    } finally {
      setLoadingCounts(false)
    }
  }, [studentClassFilter, studentStatusFilter, feeClassFilter, feeStartDate, feeEndDate, attendanceClassFilter, attendanceMonth, attendanceYear])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  const handleExport = (type: string) => {
    let url = ''
    switch (type) {
      case 'students':
        url = `/api/export/students?classId=${studentClassFilter}&status=${studentStatusFilter}`
        break
      case 'fees':
        url = `/api/export/fees?classId=${feeClassFilter}`
        if (feeStartDate) url += `&startDate=${feeStartDate}`
        if (feeEndDate) url += `&endDate=${feeEndDate}`
        break
      case 'attendance':
        if (!attendanceClassFilter || attendanceClassFilter === 'all') return
        url = `/api/export/attendance?classId=${attendanceClassFilter}&month=${attendanceMonth}&year=${attendanceYear}`
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Data Export</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export school data to CSV files for reporting and analysis.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
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
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center">
                <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Export Types</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">3</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center">
                <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Format</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">CSV</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Export Cards */}
      <div className="space-y-4">
        {exportCards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
            >
              <Card className={`shadow-sm ${card.borderColor} bg-white dark:bg-slate-800`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {card.title}
                      </CardTitle>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    {/* Students filters */}
                    {card.id === 'students' && (
                      <>
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                          <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                        <div className="flex-1 w-full sm:max-w-[200px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Class</label>
                          <Select value={feeClassFilter} onValueChange={setFeeClassFilter}>
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                            className="h-9 bg-white dark:bg-slate-800"
                            value={feeStartDate}
                            onChange={(e) => setFeeStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 w-full sm:max-w-[180px]">
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">End Date</label>
                          <Input
                            type="date"
                            className="h-9 bg-white dark:bg-slate-800"
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
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                            <SelectTrigger className="h-9 bg-white dark:bg-slate-800">
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
                    <div className="flex items-center gap-3 sm:ml-auto">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Records</p>
                        {loadingCounts ? (
                          <Skeleton className="h-5 w-12 mt-0.5" />
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {card.id === 'students' && (studentCount ?? '—')}
                            {card.id === 'fees' && (feeCount ?? '—')}
                            {card.id === 'attendance' && (attendanceCount ?? '—')}
                          </p>
                        )}
                      </div>
                      <Button
                        className={`h-9 gap-2 text-white shadow-sm ${
                          card.id === 'students'
                            ? 'bg-teal-600 hover:bg-teal-700'
                            : card.id === 'fees'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-sky-600 hover:bg-sky-700'
                        } ${card.id === 'attendance' && (!attendanceClassFilter || attendanceClassFilter === 'all') ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleExport(card.id)}
                        disabled={card.id === 'attendance' && (!attendanceClassFilter || attendanceClassFilter === 'all')}
                      >
                        <Download className="w-4 h-4" />
                        Download CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Info note */}
      <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-600">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Export Information</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                CSV files can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application.
                Data is exported with the current filters applied. Record counts update automatically when you change filters.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
