'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Save, Loader2, UserCheck, AlertCircle } from 'lucide-react'
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

  const statusColors: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
    LATE: 'bg-amber-100 text-amber-700',
    EXCUSED: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="marking">
        <TabsList className="bg-white border border-slate-200 p-0 h-auto">
          <TabsTrigger value="marking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">
            Daily Marking
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm">
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
                className="bg-teal-600 hover:bg-teal-700 text-white"
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
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Select a class to begin marking attendance</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Attendance Table */}
              <Card className="shadow-sm border-slate-200/60">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-xs font-semibold">Name</TableHead>
                        <TableHead className="text-xs font-semibold hidden sm:table-cell">Admission #</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-xs font-semibold hidden sm:table-cell">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => (
                        <TableRow key={r.studentId} className="hover:bg-slate-50">
                          <TableCell className="text-sm font-medium">{r.studentName}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500">
                            {r.admissionNumber}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={r.status}
                              onValueChange={(v) => updateStatus(r.studentId, v as AttendanceRecord['status'])}
                            >
                              <SelectTrigger className={cn('h-8 w-28', statusColors[r.status])}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PRESENT">Present</SelectItem>
                                <SelectItem value="ABSENT">Absent</SelectItem>
                                <SelectItem value="LATE">Late</SelectItem>
                                <SelectItem value="EXCUSED">Excused</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {(r.status === 'ABSENT' || r.status === 'LATE' || r.status === 'EXCUSED') && (
                              <Input
                                value={r.reason}
                                onChange={(e) => updateReason(r.studentId, e.target.value)}
                                placeholder="Reason"
                                className="h-8 text-xs"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-lg font-bold">{records.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Present</p>
                    <p className="text-lg font-bold text-green-600">{presentCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Absent</p>
                    <p className="text-lg font-bold text-red-600">{absentCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Late</p>
                    <p className="text-lg font-bold text-amber-600">{lateCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-slate-500">Rate</p>
                    <p className="text-lg font-bold text-teal-600">{attendanceRate}%</p>
                  </CardContent>
                </Card>
              </div>
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
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a class to view monthly summary</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Admission #</TableHead>
                  <TableHead className="text-xs font-semibold">Total Days</TableHead>
                  <TableHead className="text-xs font-semibold">Present</TableHead>
                  <TableHead className="text-xs font-semibold">Absent</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">Late</TableHead>
                  <TableHead className="text-xs font-semibold">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((s, i) => (
                  <TableRow key={i} className={cn('hover:bg-slate-50', s.rate < 80 && 'bg-red-50/50')}>
                    <TableCell className="text-sm font-medium">{s.studentName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-mono text-slate-500">
                      {s.admissionNumber}
                    </TableCell>
                    <TableCell className="text-sm">{s.totalDays}</TableCell>
                    <TableCell className="text-sm font-medium text-green-600">{s.present}</TableCell>
                    <TableCell className="text-sm text-red-600">{s.absent}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-amber-600">{s.late}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.rate} className="w-16 h-2" />
                        <span className={cn(
                          'text-xs font-semibold',
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
