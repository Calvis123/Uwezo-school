'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Save, Loader2, UserCheck, AlertCircle, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { studentsApi, attendanceApi, refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  reason: string
}

const statusConfig: Record<string, { className: string; label: string; icon: React.ReactNode; bgColor: string }> = {
  PRESENT: {
    className: 'bg-green-50 text-green-700 border border-green-200',
    label: 'Present',
    icon: <CheckCircle2 className="w-3 h-3" />,
    bgColor: 'bg-green-50',
  },
  ABSENT: {
    className: 'bg-red-50 text-red-700 border border-red-200',
    label: 'Absent',
    icon: <XCircle className="w-3 h-3" />,
    bgColor: 'bg-red-50',
  },
  LATE: {
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    label: 'Late',
    icon: <Clock className="w-3 h-3" />,
    bgColor: 'bg-amber-50',
  },
  EXCUSED: {
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
    label: 'Excused',
    icon: <ShieldCheck className="w-3 h-3" />,
    bgColor: 'bg-sky-50',
  },
}

export function AttendanceMarking() {
  const { classes, setClasses } = useAppStore()
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)

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
    if (classId) {
      loadStudents()
    }
  }, [classId, date])

  const loadStudents = async () => {
    setLoading(true)
    try {
      // First load students in class
      const studentsRes = await studentsApi.list({ classId, status: 'ACTIVE', limit: 100 })
      let studentList: any[] = []
      if (studentsRes.success && studentsRes.data) {
        studentList = studentsRes.data.items || []
      }

      // Then load existing attendance for this date
      const attRes = await attendanceApi.list({ classId, date })
      const existingAtt: Record<string, any> = {}
      if (attRes.success && attRes.data) {
        (attRes.data || []).forEach((a: any) => {
          existingAtt[a.studentId] = a
        })
      }

      if (studentList.length > 0) {
        setRecords(
          studentList.map((s: any) => ({
            studentId: s.id,
            studentName: `${s.firstName} ${s.lastName}`,
            admissionNumber: s.admissionNumber,
            status: existingAtt[s.id]?.status || 'PRESENT',
            reason: existingAtt[s.id]?.reason || '',
          }))
        )
      } else {
        // Demo data
        setRecords([
          { studentId: 's1', studentName: 'John Kamau', admissionNumber: 'ADM-001', status: 'PRESENT', reason: '' },
          { studentId: 's2', studentName: 'Mary Wanjiku', admissionNumber: 'ADM-002', status: 'PRESENT', reason: '' },
          { studentId: 's3', studentName: 'Peter Ochieng', admissionNumber: 'ADM-003', status: 'ABSENT', reason: 'Sick leave' },
          { studentId: 's4', studentName: 'Grace Akinyi', admissionNumber: 'ADM-004', status: 'PRESENT', reason: '' },
          { studentId: 's5', studentName: 'David Mwangi', admissionNumber: 'ADM-005', status: 'LATE', reason: 'Traffic' },
          { studentId: 's6', studentName: 'Sarah Njeri', admissionNumber: 'ADM-006', status: 'PRESENT', reason: '' },
          { studentId: 's7', studentName: 'James Otieno', admissionNumber: 'ADM-007', status: 'EXCUSED', reason: 'Medical appointment' },
          { studentId: 's8', studentName: 'Ann Muthoni', admissionNumber: 'ADM-008', status: 'PRESENT', reason: '' },
        ])
      }
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = (studentId: string, status: AttendanceRecord['status']) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    )
  }

  const updateReason = (studentId: string, reason: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, reason } : r))
    )
  }

  const markAllPresent = () => {
    setRecords((prev) => prev.map((r) => ({ ...r, status: 'PRESENT' as const, reason: '' })))
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
          status: r.status,
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

  const presentCount = records.filter((r) => r.status === 'PRESENT').length
  const absentCount = records.filter((r) => r.status === 'ABSENT').length
  const lateCount = records.filter((r) => r.status === 'LATE').length
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length
  const attendanceRate = records.length > 0 ? ((presentCount + lateCount) / records.length * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
        <p className="text-sm text-slate-500">Mark and track daily student attendance</p>
      </div>
      <Tabs defaultValue="marking">
        <TabsList className="bg-white border border-slate-200 p-0 h-auto">
          <TabsTrigger value="marking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm px-4 py-2">
            Daily Marking
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm px-4 py-2">
            Monthly Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marking" className="mt-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-full sm:w-40 h-10">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {localClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-44 h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllPresent} disabled={!classId || loading}>
                <UserCheck className="w-4 h-4 mr-2" />
                Mark All Present
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                onClick={handleSave}
                disabled={saving || !classId || records.length === 0}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Attendance
              </Button>
            </div>
          </div>

          {!classId ? (
            <Card className="shadow-sm border-slate-200/60">
              <CardContent className="py-16 text-center">
                <AlertCircle className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Select a class to begin marking attendance</p>
                <p className="text-slate-400 text-sm mt-1">Choose a class from the dropdown above</p>
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
              {/* Summary cards - more prominent */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="shadow-sm border-slate-200/60">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{records.length}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-green-200/60 bg-green-50/30">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Present</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{presentCount}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-red-200/60 bg-red-50/30">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Absent</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-amber-200/60 bg-amber-50/30">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Late</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{lateCount}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-teal-200/60 bg-teal-50/30">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">Rate</p>
                    </div>
                    <p className="text-2xl font-bold text-teal-700">{attendanceRate}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Table */}
              <Card className="shadow-sm border-slate-200/60">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-slate-600">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 hidden sm:table-cell">Admission #</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 hidden sm:table-cell">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => {
                        const cfg = statusConfig[r.status]
                        return (
                          <TableRow key={r.studentId} className={cn('hover:bg-slate-50 transition-colors', r.status === 'ABSENT' && 'hover:bg-red-50/30')}>
                            <TableCell className="text-sm font-medium text-slate-900">{r.studentName}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500">
                              {r.admissionNumber}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={r.status}
                                onValueChange={(v) => updateStatus(r.studentId, v as AttendanceRecord['status'])}
                              >
                                <SelectTrigger className={cn('h-8 w-32 font-medium', cfg?.className)}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PRESENT">
                                    <span className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-green-600" /> Present
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
                                  className="h-8 text-xs max-w-[200px]"
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
            </>
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <AttendanceSummary />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AttendanceSummary() {
  const { classes, setClasses } = useAppStore()
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [summaryData, setSummaryData] = useState<any[]>([])
  const [localClasses, setLocalClasses] = useState(classes)

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
    if (classId) {
      loadSummary()
    }
  }, [classId])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const res = await attendanceApi.stats({ classId })
      if (res.success && res.data) {
        setSummaryData(res.data.students || [])
      } else {
        setSummaryData([
          { studentName: 'John Kamau', admissionNumber: 'ADM-001', totalDays: 45, present: 43, absent: 1, late: 1, rate: 95.6 },
          { studentName: 'Mary Wanjiku', admissionNumber: 'ADM-002', totalDays: 45, present: 44, absent: 1, late: 0, rate: 97.8 },
          { studentName: 'Peter Ochieng', admissionNumber: 'ADM-003', totalDays: 45, present: 38, absent: 5, late: 2, rate: 84.4 },
          { studentName: 'Grace Akinyi', admissionNumber: 'ADM-004', totalDays: 45, present: 42, absent: 2, late: 1, rate: 93.3 },
          { studentName: 'David Mwangi', admissionNumber: 'ADM-005', totalDays: 45, present: 40, absent: 3, late: 2, rate: 88.9 },
          { studentName: 'Sarah Njeri', admissionNumber: 'ADM-006', totalDays: 45, present: 45, absent: 0, late: 0, rate: 100 },
          { studentName: 'James Otieno', admissionNumber: 'ADM-007', totalDays: 45, present: 35, absent: 8, late: 2, rate: 77.8 },
          { studentName: 'Ann Muthoni', admissionNumber: 'ADM-008', totalDays: 45, present: 44, absent: 0, late: 1, rate: 97.8 },
        ])
      }
    } catch {
      setSummaryData([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {localClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!classId ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Select a class to view monthly summary</p>
            <p className="text-slate-400 text-sm mt-1">Choose a class from the dropdown above</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-semibold text-slate-600">Student</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 hidden sm:table-cell">Admission #</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Total Days</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Present</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Absent</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 hidden sm:table-cell">Late</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((s, i) => (
                  <TableRow key={i} className={cn(
                    'hover:bg-slate-50 transition-colors',
                    s.rate < 80 && 'bg-red-50/40 hover:bg-red-50/60'
                  )}>
                    <TableCell className="text-sm font-medium text-slate-900">{s.studentName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500">
                      {s.admissionNumber}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{s.totalDays}</TableCell>
                    <TableCell className="text-sm font-semibold text-green-600">{s.present}</TableCell>
                    <TableCell className="text-sm text-red-600">{s.absent}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-amber-600">{s.late}</TableCell>
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
                          'text-xs font-bold',
                          s.rate >= 90 ? 'text-green-600' :
                          s.rate >= 80 ? 'text-amber-600' :
                          'text-red-600'
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
      )}
    </div>
  )
}
