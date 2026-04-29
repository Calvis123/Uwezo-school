'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Save, Loader2, UserCheck, AlertCircle, CheckCircle2, XCircle, Clock, ShieldCheck, Users, BarChart3, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { studentsApi, attendanceApi, refApi, teacherApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface AttendanceRecord {
  studentId: string
  studentName: string
  admissionNumber: string
  status: 'UNMARKED' | 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  reason: string
}

const statusConfig: Record<string, { className: string; label: string; icon: React.ReactNode; bgColor: string; dotColor: string }> = {
  UNMARKED: {
    className: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    label: 'Unmarked',
    icon: <AlertCircle className="w-3 h-3" />,
    bgColor: 'bg-slate-50 dark:bg-slate-800',
    dotColor: 'bg-slate-400',
  },
  PRESENT: {
    className: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800',
    label: 'Present',
    icon: <CheckCircle2 className="w-3 h-3" />,
    bgColor: 'bg-green-50 dark:bg-green-900/40',
    dotColor: 'bg-green-500',
  },
  ABSENT: {
    className: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
    label: 'Absent',
    icon: <XCircle className="w-3 h-3" />,
    bgColor: 'bg-red-50 dark:bg-red-900/40',
    dotColor: 'bg-red-500',
  },
  LATE: {
    className: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
    label: 'Late',
    icon: <Clock className="w-3 h-3" />,
    bgColor: 'bg-amber-50 dark:bg-amber-900/40',
    dotColor: 'bg-amber-500',
  },
  EXCUSED: {
    className: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
    label: 'Excused',
    icon: <ShieldCheck className="w-3 h-3" />,
    bgColor: 'bg-sky-50 dark:bg-sky-900/40',
    dotColor: 'bg-sky-500',
  },
}

// Attendance rate circle component
function AttendanceRateCircle({ rate, size = 72 }: { rate: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (rate / 100) * circumference

  const strokeColor = rate >= 90 ? '#059669' : rate >= 70 ? '#0d9488' : rate >= 50 ? '#f59e0b' : '#ef4444'
  const bgColor = rate >= 90 ? '#d1fae5' : rate >= 70 ? '#ccfbf1' : rate >= 50 ? '#fef3c7' : '#fee2e2'
  const textColor = rate >= 90 ? 'text-green-600 dark:text-green-400' : rate >= 70 ? 'text-teal-600 dark:text-teal-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-base font-bold tabular-nums', textColor)}>{rate.toFixed(0)}%</span>
        <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">rate</span>
      </div>
    </div>
  )
}

export function AttendanceMarking() {
  const { user, classes, setClasses, selectedClassId } = useAppStore()
  const canMarkAttendance = user?.role === 'TEACHER'
  const initialTab = canMarkAttendance ? 'marking' : 'school-reports'
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    if (canMarkAttendance) {
      teacherApi.classes().then((res) => {
        if (res.success && res.data) {
          setLocalClasses(Array.isArray(res.data) ? res.data : [])
        } else {
          setLocalClasses([])
        }
      })
    } else if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses, canMarkAttendance])

  useEffect(() => {
    if (!canMarkAttendance) return
    if (classId) return
    if (localClasses.length === 0) return
    const preferredClassId = selectedClassId && localClasses.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : localClasses[0].id
    setClassId(preferredClassId)
  }, [canMarkAttendance, classId, localClasses, selectedClassId])

  useEffect(() => {
    if (classId) {
      loadStudents()
    }
  }, [classId, date])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const studentsRes = await studentsApi.list({ classId, status: 'ACTIVE', limit: 100 })
      let studentList: any[] = []
      if (studentsRes.success && studentsRes.data) {
        studentList = studentsRes.data.items || []
      }

      const attRes = await attendanceApi.list({ classId, date })
      const existingAtt: Record<string, any> = {}
      if (attRes.success && attRes.data) {
        const attendanceItems = Array.isArray(attRes.data)
          ? attRes.data
          : Array.isArray((attRes.data as any).items)
            ? (attRes.data as any).items
            : []
        attendanceItems.forEach((a: any) => {
          existingAtt[a.studentId] = a
        })
      }

      if (studentList.length > 0) {
        setRecords(
          studentList.map((s: any) => ({
            studentId: s.id,
            studentName: `${s.firstName} ${s.lastName}`,
            admissionNumber: s.admissionNumber,
            status: existingAtt[s.id]?.status || 'UNMARKED',
            reason: existingAtt[s.id]?.reason || '',
          }))
        )
      } else {
        setRecords([])
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = (studentId: string, status: AttendanceRecord['status']) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status, reason: status === 'PRESENT' || status === 'UNMARKED' ? '' : r.reason }
          : r
      )
    )
  }

  const updateReason = (studentId: string, reason: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, reason } : r))
    )
  }

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' as const, reason: '' })))
    toast.success('All students marked as present')
  }

  const handleSave = async () => {
    if (!classId) {
      toast.error('Please select a class')
      return
    }
    setSaving(true)
    try {
      const result = await attendanceApi.mark({
        classId,
        date,
        records: records.map((r) => ({
          studentId: r.studentId,
          status: r.status === 'UNMARKED' ? null : r.status,
          reason: r.reason,
        })),
      })
      if (result.success) {
        toast.success('Attendance saved successfully')
      } else {
        toast.error(result.error || 'Failed to save attendance')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = direction === 'prev' ? subDays(new Date(date), 1) : addDays(new Date(date), 1)
    setDate(format(d, 'yyyy-MM-dd'))
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const isToday = date === today

  const presentCount = records.filter((r) => r.status === 'PRESENT').length
  const absentCount = records.filter((r) => r.status === 'ABSENT').length
  const lateCount = records.filter((r) => r.status === 'LATE').length
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length
  const unmarkedCount = records.filter((r) => r.status === 'UNMARKED').length
  const markedCount = records.length - unmarkedCount
  const attendanceRate = markedCount > 0 ? ((presentCount + lateCount) / markedCount * 100) : 0
  const selectedClass = localClasses.find((c) => c.id === classId)
  const filteredRecords = records.filter((record) => {
    const query = studentSearch.trim().toLowerCase()
    if (!query) return true
    return (
      record.studentName.toLowerCase().includes(query) ||
      record.admissionNumber.toLowerCase().includes(query)
    )
  })

  const cardAnim = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: i * 0.05 },
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          Attendance
          {selectedClass && (
            <Badge variant="secondary" className="bg-teal-50 text-teal-700 text-xs font-medium">
              {selectedClass.name}
            </Badge>
          )}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Mark and track daily student attendance</p>
      </div>
      <Tabs defaultValue={initialTab}>
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0 h-auto">
          {canMarkAttendance && (
            <TabsTrigger value="marking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm px-4 py-2">
              Daily Marking
            </TabsTrigger>
          )}
          {canMarkAttendance && (
            <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm px-4 py-2">
              Monthly Summary
            </TabsTrigger>
          )}
          {canMarkAttendance && (
            <TabsTrigger value="matrix" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm px-4 py-2">
              Attendance Matrix
            </TabsTrigger>
          )}
          {!canMarkAttendance && (
            <TabsTrigger value="school-reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 text-sm px-4 py-2">
              School Reports
            </TabsTrigger>
          )}
        </TabsList>

        {canMarkAttendance && (
        <TabsContent value="marking" className="mt-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {canMarkAttendance ? (
                <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {selectedClass?.name || 'Assigned class'}
                  </span>
                  {selectedClass?.studentCount !== undefined && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                      ({selectedClass.studentCount})
                    </span>
                  )}
                </div>
              ) : (
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {localClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.name}
                          {c.studentCount !== undefined && (
                            <span className="text-xs text-slate-400">({c.studentCount})</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Date Picker with Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => navigateDate('prev')}
                  disabled={isToday}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={today}
                  className="w-[140px] h-10 bg-white dark:bg-slate-800 text-center text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => navigateDate('next')}
                  disabled={isToday}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student..."
                  className="w-[190px] pl-9 h-10 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!classId || loading} className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Mark All Present
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={handleSave}
                  disabled={saving || !classId || records.length === 0}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Attendance
                </Button>
              </motion.div>
            </div>
          </div>

          {!classId ? (
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardContent className="py-16 text-center">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="inline-block"
                >
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                </motion.div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Select a class to begin marking attendance</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  {canMarkAttendance ? 'No class is assigned to your account yet.' : 'Choose a class from the dropdown above'}
                </p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary cards with attendance rate circle */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                <motion.div {...cardAnim(0)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-1.5">
                        <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">{records.length}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(1)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-green-200/60 bg-gradient-to-br from-green-50/80 to-white dark:from-green-900/20 dark:to-slate-800 dark:border-green-800/40 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Present</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400 tabular-nums">{presentCount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(2)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-red-200/60 bg-gradient-to-br from-red-50/80 to-white dark:from-red-900/20 dark:to-slate-800 dark:border-red-800/40 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-1.5">
                        <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                      </div>
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Absent</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{absentCount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(3)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/20 dark:to-slate-800 dark:border-amber-800/40 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-1.5">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Late</p>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">{lateCount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(4)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-900/20 dark:to-slate-800 dark:border-sky-800/40 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center mx-auto mb-1.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <p className="text-xs font-medium text-sky-700 dark:text-sky-400 uppercase tracking-wider">Excused</p>
                      <p className="text-2xl font-bold text-sky-700 dark:text-sky-400 tabular-nums">{excusedCount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(5)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className="shadow-sm border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800 dark:to-slate-800/80 dark:border-slate-700/60 hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4 text-center">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-1.5">
                        <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unmarked</p>
                      <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">{unmarkedCount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div {...cardAnim(6)} whileHover={{ y: -2 }} className="col-span-1">
                  <Card className={cn(
                    'shadow-sm hover:shadow-md transition-shadow duration-300 border',
                    attendanceRate >= 90
                      ? 'border-green-200/60 dark:border-green-800/40'
                      : attendanceRate >= 70
                        ? 'border-amber-200/60 dark:border-amber-800/40'
                        : 'border-red-200/60 dark:border-red-800/40'
                  )}>
                    <CardContent className="p-3 flex flex-col items-center">
                      <AttendanceRateCircle rate={attendanceRate} size={64} />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Quick student list for individual marking */}
              <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Student Quick Mark
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {filteredRecords.length} visible
                    </Badge>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {filteredRecords.length === 0 ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 py-2">No students match your search.</div>
                    ) : (
                      filteredRecords.map((record) => (
                        <div
                          key={`quick-${record.studentId}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 dark:border-slate-700/60 p-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{record.studentName}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{record.admissionNumber}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant={record.status === 'UNMARKED' ? 'default' : 'outline'} className="h-7 px-2 text-[10px]" onClick={() => updateStatus(record.studentId, 'UNMARKED')}>U</Button>
                            <Button size="sm" variant={record.status === 'PRESENT' ? 'default' : 'outline'} className="h-7 px-2 text-[10px]" onClick={() => updateStatus(record.studentId, 'PRESENT')}>P</Button>
                            <Button size="sm" variant={record.status === 'ABSENT' ? 'default' : 'outline'} className="h-7 px-2 text-[10px]" onClick={() => updateStatus(record.studentId, 'ABSENT')}>A</Button>
                            <Button size="sm" variant={record.status === 'LATE' ? 'default' : 'outline'} className="h-7 px-2 text-[10px]" onClick={() => updateStatus(record.studentId, 'LATE')}>L</Button>
                            <Button size="sm" variant={record.status === 'EXCUSED' ? 'default' : 'outline'} className="h-7 px-2 text-[10px]" onClick={() => updateStatus(record.studentId, 'EXCUSED')}>E</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80">
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-8">#</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Name</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Admission #</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                              No students match your search.
                            </TableCell>
                          </TableRow>
                        ) : filteredRecords.map((r, idx) => {
                          const cfg = statusConfig[r.status]
                          return (
                            <TableRow key={r.studentId} className={cn(
                              'transition-all duration-150',
                              r.status === 'ABSENT' && 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/20',
                              r.status === 'PRESENT' && 'hover:bg-green-50/20 dark:hover:bg-green-900/10',
                              r.status === 'LATE' && 'hover:bg-amber-50/20 dark:hover:bg-amber-900/10',
                              r.status === 'EXCUSED' && 'hover:bg-sky-50/20 dark:hover:bg-sky-900/10',
                              r.status === 'UNMARKED' && 'hover:bg-slate-50/60 dark:hover:bg-slate-700/20',
                            )}>
                              <TableCell className="text-xs text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg?.dotColor)} />
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.studentName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500 dark:text-slate-400">
                                {r.admissionNumber}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={r.status}
                                  onValueChange={(v) => updateStatus(r.studentId, v as AttendanceRecord['status'])}
                                >
                                  <SelectTrigger className={cn('h-8 w-32 font-medium text-xs', cfg?.className)}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PRESENT">
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-green-600" /> Present
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="UNMARKED">
                                      <span className="flex items-center gap-1.5">
                                        <AlertCircle className="w-3 h-3 text-slate-500" /> Unmarked
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="ABSENT">
                                      <span className="flex items-center gap-1.5">
                                        <XCircle className="w-3 h-3 text-red-500" /> Absent
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="LATE">
                                      <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-amber-500" /> Late
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="EXCUSED">
                                      <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="w-3 h-3 text-sky-500" /> Excused
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {(r.status === 'ABSENT' || r.status === 'LATE' || r.status === 'EXCUSED') && (
                                  <Input
                                    value={r.reason}
                                    onChange={(e) => updateReason(r.studentId, e.target.value)}
                                    placeholder="Reason..."
                                    className="h-8 text-xs max-w-[200px] bg-white dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 transition-all duration-200"
                                  />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </TabsContent>
        )}

        {canMarkAttendance && (
          <TabsContent value="summary" className="mt-4">
            <AttendanceSummary />
          </TabsContent>
        )}
        {canMarkAttendance && (
          <TabsContent value="matrix" className="mt-4">
            <AttendanceMatrix />
          </TabsContent>
        )}
        {!canMarkAttendance && (
          <TabsContent value="school-reports" className="mt-4">
            <SchoolAttendanceReports />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function SchoolAttendanceReports() {
  const { classes, setClasses, selectedClassId } = useAppStore()
  const [localClasses, setLocalClasses] = useState(classes)
  const [classId, setClassId] = useState('ALL_CLASSES')
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any | null>(null)

  useEffect(() => {
    if (isTeacherView) {
      teacherApi.classes().then((res) => {
        if (res.success && res.data) {
          setLocalClasses(Array.isArray(res.data) ? res.data : [])
        } else {
          setLocalClasses([])
        }
      })
    } else if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses, isTeacherView])

  useEffect(() => {
    if (selectedClassId && localClasses.some((c) => c.id === selectedClassId) && classId !== selectedClassId) {
      setClassId(selectedClassId)
    }
  }, [classId, localClasses, selectedClassId])

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true)
      try {
        const now = new Date()
        let start = now
        let end = now
        if (period === 'WEEKLY') {
          start = startOfWeek(now, { weekStartsOn: 1 })
          end = endOfWeek(now, { weekStartsOn: 1 })
        } else if (period === 'MONTHLY') {
          start = startOfMonth(now)
          end = endOfMonth(now)
        }

        const res = await attendanceApi.stats({
          classId: classId === 'ALL_CLASSES' ? undefined : classId,
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
        })
        if (res.success && res.data) {
          setReport(res.data)
        } else {
          setReport(null)
        }
      } catch {
        setReport(null)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [classId, period])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as 'DAILY' | 'WEEKLY' | 'MONTHLY')}>
          <SelectTrigger className="w-full sm:w-44 h-10 bg-white dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DAILY">Daily Summary</SelectItem>
            <SelectItem value="WEEKLY">Weekly Summary</SelectItem>
            <SelectItem value="MONTHLY">Monthly Summary</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full sm:w-52 h-10 bg-white dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
            {localClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.stream ? ` ${c.stream}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60"><CardContent className="p-3 text-center"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold tabular-nums">{report?.overall?.totalRecords || 0}</p></CardContent></Card>
            <Card className="shadow-sm border-green-200/60 dark:border-green-800/40"><CardContent className="p-3 text-center"><p className="text-xs text-green-600">Present</p><p className="text-xl font-bold text-green-600 tabular-nums">{report?.overall?.present || 0}</p></CardContent></Card>
            <Card className="shadow-sm border-red-200/60 dark:border-red-800/40"><CardContent className="p-3 text-center"><p className="text-xs text-red-600">Absent</p><p className="text-xl font-bold text-red-600 tabular-nums">{report?.overall?.absent || 0}</p></CardContent></Card>
            <Card className="shadow-sm border-amber-200/60 dark:border-amber-800/40"><CardContent className="p-3 text-center"><p className="text-xs text-amber-600">Late</p><p className="text-xl font-bold text-amber-600 tabular-nums">{report?.overall?.late || 0}</p></CardContent></Card>
            <Card className="shadow-sm border-sky-200/60 dark:border-sky-800/40"><CardContent className="p-3 text-center"><p className="text-xs text-sky-600">Excused</p><p className="text-xl font-bold text-sky-600 tabular-nums">{report?.overall?.excused || 0}</p></CardContent></Card>
            <Card className="shadow-sm border-teal-200/60 dark:border-teal-800/40"><CardContent className="p-3 text-center"><p className="text-xs text-teal-600">Rate</p><p className="text-xl font-bold text-teal-600 tabular-nums">{(report?.overall?.attendanceRate || 0).toFixed(1)}%</p></CardContent></Card>
          </div>

          <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/80">
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report?.classWise || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-500">No attendance report data for this period.</TableCell>
                    </TableRow>
                  ) : (
                    (report.classWise || []).map((row: any) => (
                      <TableRow key={row.classId}>
                        <TableCell>{row.className}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.totalStudents}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.totalRecords}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">{row.present}</TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">{row.absent}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">{row.late}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{row.attendanceRate.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function AttendanceSummary() {
  const { user, classes, setClasses, selectedClassId } = useAppStore()
  const isTeacherView = user?.role === 'TEACHER'
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [localClasses, setLocalClasses] = useState(classes)

  useEffect(() => {
    if (isTeacherView) {
      teacherApi.classes().then((res) => {
        if (res.success && res.data) {
          setLocalClasses(Array.isArray(res.data) ? res.data : [])
        } else {
          setLocalClasses([])
        }
      })
    } else if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) {
          setClasses(res.data)
          setLocalClasses(res.data)
        }
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes, setClasses, isTeacherView])

  useEffect(() => {
    if (!isTeacherView) return
    if (classId) return
    if (localClasses.length === 0) return
    const preferredClassId = selectedClassId && localClasses.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : localClasses[0].id
    setClassId(preferredClassId)
  }, [isTeacherView, classId, localClasses, selectedClassId])

  useEffect(() => {
    if (classId) {
      loadSummary()
    }
  }, [classId])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const res = await attendanceApi.stats({ classId })
      if (res.success && res.data) {
        const studentWise = Array.isArray(res.data.studentWise) ? res.data.studentWise : []
        const mapped = studentWise.map((student: any) => ({
          studentName: student.studentName,
          admissionNumber: student.admissionNumber,
          totalDays: student.totalRecords || 0,
          present: student.present || 0,
          absent: student.absent || 0,
          late: student.late || 0,
          rate: student.attendanceRate || 0,
        }))
        setSummaryData(mapped)
      } else {
        setSummaryData([])
      }
    } catch {
      setSummaryData([])
    } finally {
      setLoading(false)
    }
  }

  const selectedClass = localClasses.find((c) => c.id === classId)
  const avgRate = summaryData.length > 0
    ? (summaryData.reduce((sum: number, s: any) => sum + s.rate, 0) / summaryData.length)
    : 0
  const highRiskStudents = summaryData.filter((s: any) => s.rate < 80).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isTeacherView ? (
          <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {selectedClass?.name || 'Assigned class'}
            </span>
            {selectedClass?.studentCount !== undefined && (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                ({selectedClass.studentCount})
              </span>
            )}
          </div>
        ) : (
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-44 h-10 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {localClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    {c.name}
                    {c.studentCount !== undefined && (
                      <span className="text-xs text-slate-400">({c.studentCount})</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!classId ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="py-16 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block"
            >
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
            </motion.div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Select a class to view monthly summary</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              {isTeacherView ? 'No class is assigned to your account yet.' : 'Choose a class from the dropdown above'}
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Stats with Rate Circle */}
          {summaryData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Students</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{summaryData.length}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-2">
                <Card className="shadow-sm border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-teal-50/60 to-white dark:from-teal-900/20 dark:to-slate-800">
                  <CardContent className="p-4 flex items-center gap-4">
                    <AttendanceRateCircle rate={avgRate} size={64} />
                    <div className="text-left">
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-medium uppercase tracking-wider">Class Average</p>
                      <p className={cn(
                        'text-2xl font-bold tabular-nums',
                        avgRate >= 90 ? 'text-green-600 dark:text-green-400' : avgRate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      )}>{avgRate.toFixed(1)}%</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{selectedClass?.name || ''}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="shadow-sm border-green-200/60 dark:border-green-800/40 bg-gradient-to-br from-green-50/60 to-white dark:from-green-900/20 dark:to-slate-800">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Above 90%</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{summaryData.filter((s: any) => s.rate >= 90).length}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className={cn(
                  'shadow-sm border dark:border-red-800/40',
                  highRiskStudents > 0 ? 'border-red-200/60 bg-gradient-to-br from-red-50/60 to-white dark:from-red-900/20 dark:to-slate-800' : 'border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800'
                )}>
                  <CardContent className="p-3 text-center">
                    <p className={cn(
                      'text-xs font-medium',
                      highRiskStudents > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                    )}>High Risk</p>
                    <p className={cn(
                      'text-xl font-bold tabular-nums',
                      highRiskStudents > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                    )}>{highRiskStudents}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/80">
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-8">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Student</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Admission #</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Days</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Present</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Absent</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Late</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((s: any, i: number) => (
                      <TableRow key={i} className={cn(
                        'transition-all duration-150',
                        s.rate < 80 && 'bg-red-50/40 dark:bg-red-900/20 hover:bg-red-50/60 dark:hover:bg-red-900/30 border-l-2 border-l-red-400',
                        s.rate >= 90 && s.rate < 95 && 'hover:bg-green-50/20 dark:hover:bg-green-900/10',
                      )}>
                        <TableCell className="text-xs text-slate-400 dark:text-slate-500 font-mono">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.studentName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500 dark:text-slate-400">
                          {s.admissionNumber}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">{s.totalDays}</TableCell>
                        <TableCell className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">{s.present}</TableCell>
                        <TableCell className="text-sm text-red-600 dark:text-red-400 tabular-nums">{s.absent}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-amber-600 dark:text-amber-400 tabular-nums">{s.late}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={s.rate}
                              className={cn(
                                'w-16 h-2',
                                s.rate >= 90 ? '[&>div]:bg-green-500' :
                                s.rate >= 80 ? '[&>div]:bg-amber-500' :
                                '[&>div]:bg-red-500'
                              )}
                            />
                            <span className={cn(
                              'text-xs font-bold tabular-nums',
                              s.rate >= 90 ? 'text-green-600 dark:text-green-400' :
                              s.rate >= 80 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            )}>
                              {s.rate.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}

function AttendanceMatrix() {
  const { user, classes, setClasses, selectedClassId } = useAppStore()
  const isTeacherView = user?.role === 'TEACHER'
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [monthInput, setMonthInput] = useState(format(new Date(), 'yyyy-MM'))
  const [dates, setDates] = useState<Array<{ value: string; day: number; short: string }>>([])
  const [students, setStudents] = useState<Array<{ id: string; name: string; admissionNumber: string }>>([])
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({})

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
    if (!isTeacherView) return
    if (classId) return
    if (localClasses.length === 0) return
    const preferredClassId = selectedClassId && localClasses.some((c) => c.id === selectedClassId)
      ? selectedClassId
      : localClasses[0].id
    setClassId(preferredClassId)
  }, [isTeacherView, classId, localClasses, selectedClassId])

  useEffect(() => {
    if (!classId) return
    loadMatrix()
  }, [classId, monthInput])

  const selectedClass = localClasses.find((c) => c.id === classId)

  const loadMatrix = async () => {
    if (!classId) return
    setLoading(true)
    try {
      const [yearStr, monthStr] = monthInput.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)
      const res = await attendanceApi.matrix({ classId, month, year })
      if (res.success && res.data) {
        setDates(res.data.dates || [])
        setStudents(res.data.students || [])
        setMatrix(res.data.matrix || {})
      } else {
        setDates([])
        setStudents([])
        setMatrix({})
      }
    } finally {
      setLoading(false)
    }
  }

  const statusCell = (status?: string) => {
    if (!status) return <span className="text-slate-300 dark:text-slate-600">—</span>
    if (status === 'ABSENT') return <XCircle className="w-4 h-4 text-red-500 mx-auto" />
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-3 items-center">
          {isTeacherView ? (
            <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {selectedClass?.name || 'Assigned class'}
              </span>
              {selectedClass?.studentCount !== undefined && (
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                  ({selectedClass.studentCount})
                </span>
              )}
            </div>
          ) : (
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-44 h-10 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {localClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            type="month"
            value={monthInput}
            onChange={(e) => setMonthInput(e.target.value)}
            className="w-[170px] h-10 bg-white dark:bg-slate-800"
          />
        </div>
        <Badge variant="outline">
          ✓ Present/Late/Excused · ✕ Absent
        </Badge>
      </div>

      {!classId ? (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isTeacherView ? 'No class is assigned to your account yet.' : 'Select a class to view attendance matrix.'}
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-slate-800/80">
                  <TableHead className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 min-w-[220px]">Student</TableHead>
                  {dates.map((d) => (
                    <TableHead key={d.value} className="text-center min-w-[56px]">
                      <div className="flex flex-col leading-tight">
                        <span className="text-[10px] text-slate-400">{d.short}</span>
                        <span className="text-xs font-semibold">{d.day}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dates.length + 1} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      No students or attendance records for this selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-700/20">
                      <TableCell className="sticky left-0 z-10 bg-white dark:bg-slate-800 min-w-[220px]">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{student.name}</span>
                          <span className="text-[11px] text-slate-400">{student.admissionNumber}</span>
                        </div>
                      </TableCell>
                      {dates.map((d) => (
                        <TableCell key={d.value} className="text-center">
                          {statusCell(matrix?.[student.id]?.[d.value])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
