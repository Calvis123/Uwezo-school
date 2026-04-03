'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Printer, Download, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { examsApi, refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

function getGrade(marks: number): string {
  if (marks >= 90) return 'A'
  if (marks >= 80) return 'A-'
  if (marks >= 75) return 'B+'
  if (marks >= 70) return 'B'
  if (marks >= 65) return 'B-'
  if (marks >= 60) return 'C+'
  if (marks >= 55) return 'C'
  if (marks >= 50) return 'C-'
  if (marks >= 45) return 'D+'
  if (marks >= 40) return 'D'
  return 'E'
}

function getRemarks(marks: number): string {
  if (marks >= 80) return 'Excellent'
  if (marks >= 60) return 'Good'
  if (marks >= 50) return 'Average'
  if (marks >= 40) return 'Below Average'
  return 'Needs Improvement'
}

interface ReportStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  marks: { subject: string; marks: number; grade: string; remarks: string }[]
  totalMarks: number
  meanGrade: string
  position: number
}

export function ReportCards() {
  const { selectedExamId, classes, setCurrentView } = useAppStore()
  const [examId, setExamId] = useState(selectedExamId || '')
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<ReportStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<ReportStudent | null>(null)
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [examList, setExamList] = useState<any[]>([])

  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) setLocalClasses(res.data)
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes])

  useEffect(() => {
    if (examId && classId) {
      loadReportCards()
    }
  }, [examId, classId])

  const loadReportCards = async () => {
    setLoading(true)
    try {
      const res = await examsApi.getMarks(examId)
      if (res.success && res.data) {
        const subjectNames = res.data.subjects || []
        const studentsData = res.data.students || []
        const marksData = res.data.marks || []

        const reportStudents: ReportStudent[] = studentsData.map((s: any) => {
          const studentMarks = subjectNames.map((sub: any) => {
            const mark = marksData.find((m: any) => m.studentId === s.id && m.subjectId === sub.id)
            const m = mark?.marks || 0
            return {
              subject: sub.name || sub.code,
              marks: m,
              grade: getGrade(m),
              remarks: getRemarks(m),
            }
          })
          const total = studentMarks.reduce((sum: number, m: any) => sum + m.marks, 0)
          const avg = studentMarks.length > 0 ? total / studentMarks.length : 0
          return {
            id: s.id,
            admissionNumber: s.admissionNumber,
            firstName: s.firstName,
            lastName: s.lastName,
            gender: s.gender,
            marks: studentMarks,
            totalMarks: total,
            meanGrade: getGrade(avg),
            position: 0,
          }
        })

        // Calculate positions
        const sorted = [...reportStudents].sort((a, b) => b.totalMarks - a.totalMarks)
        sorted.forEach((s, i) => {
          const original = reportStudents.find((r) => r.id === s.id)
          if (original) original.position = i + 1
        })

        setStudents(reportStudents)
      } else {
        // Demo data
        const demoStudents: ReportStudent[] = [
          { id: 's1', admissionNumber: 'ADM-001', firstName: 'John', lastName: 'Kamau', gender: 'MALE', marks: [{ subject: 'Mathematics', marks: 85, grade: 'A-', remarks: 'Excellent' }, { subject: 'English', marks: 72, grade: 'B+', remarks: 'Good' }, { subject: 'Kiswahili', marks: 78, grade: 'B+', remarks: 'Good' }, { subject: 'Science', marks: 90, grade: 'A', remarks: 'Excellent' }, { subject: 'Social Studies', marks: 68, grade: 'B', remarks: 'Good' }], totalMarks: 393, meanGrade: 'B+', position: 2 },
          { id: 's2', admissionNumber: 'ADM-002', firstName: 'Mary', lastName: 'Wanjiku', gender: 'FEMALE', marks: [{ subject: 'Mathematics', marks: 92, grade: 'A', remarks: 'Excellent' }, { subject: 'English', marks: 88, grade: 'A-', remarks: 'Excellent' }, { subject: 'Kiswahili', marks: 85, grade: 'A-', remarks: 'Excellent' }, { subject: 'Science', marks: 95, grade: 'A', remarks: 'Excellent' }, { subject: 'Social Studies', marks: 82, grade: 'A-', remarks: 'Excellent' }], totalMarks: 442, meanGrade: 'A-', position: 1 },
          { id: 's3', admissionNumber: 'ADM-003', firstName: 'Peter', lastName: 'Ochieng', gender: 'MALE', marks: [{ subject: 'Mathematics', marks: 65, grade: 'B', remarks: 'Good' }, { subject: 'English', marks: 58, grade: 'C+', remarks: 'Average' }, { subject: 'Kiswahili', marks: 62, grade: 'C+', remarks: 'Good' }, { subject: 'Science', marks: 70, grade: 'B', remarks: 'Good' }, { subject: 'Social Studies', marks: 55, grade: 'C', remarks: 'Average' }], totalMarks: 310, meanGrade: 'C+', position: 5 },
          { id: 's4', admissionNumber: 'ADM-004', firstName: 'Grace', lastName: 'Akinyi', gender: 'FEMALE', marks: [{ subject: 'Mathematics', marks: 78, grade: 'B+', remarks: 'Good' }, { subject: 'English', marks: 82, grade: 'A-', remarks: 'Excellent' }, { subject: 'Kiswahili', marks: 75, grade: 'B+', remarks: 'Good' }, { subject: 'Science', marks: 80, grade: 'A-', remarks: 'Excellent' }, { subject: 'Social Studies', marks: 76, grade: 'B+', remarks: 'Good' }], totalMarks: 391, meanGrade: 'B+', position: 3 },
          { id: 's5', admissionNumber: 'ADM-005', firstName: 'David', lastName: 'Mwangi', gender: 'MALE', marks: [{ subject: 'Mathematics', marks: 72, grade: 'B+', remarks: 'Good' }, { subject: 'English', marks: 65, grade: 'B', remarks: 'Good' }, { subject: 'Kiswahili', marks: 70, grade: 'B', remarks: 'Good' }, { subject: 'Science', marks: 68, grade: 'B', remarks: 'Good' }, { subject: 'Social Studies', marks: 62, grade: 'C+', remarks: 'Good' }], totalMarks: 337, meanGrade: 'B', position: 4 },
        ]
        setStudents(demoStudents)
      }
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
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
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger className="w-full sm:w-72 h-10">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Term 1 End Term Exam</SelectItem>
              <SelectItem value="2">Term 1 CAT 2</SelectItem>
              <SelectItem value="3">Term 1 CAT 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!examId || !classId ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a class and exam to view report cards</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : selectedStudent ? (
        /* Individual Report Card */
        <Card className="shadow-sm border-slate-200/60 print:shadow-none print:border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-teal-700">Olives School</h2>
                <p className="text-xs text-slate-500">Academic Report Card</p>
              </div>
              <Button variant="outline" size="sm" className="print:hidden" onClick={() => setSelectedStudent(null)}>
                ← Back
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm"><span className="text-slate-500">Name: </span><span className="font-semibold">{selectedStudent.firstName} {selectedStudent.lastName}</span></p>
                <p className="text-sm"><span className="text-slate-500">Admission #: </span><span className="font-mono">{selectedStudent.admissionNumber}</span></p>
                <p className="text-sm"><span className="text-slate-500">Gender: </span>{selectedStudent.gender}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-slate-500">Class: </span>{classId}</p>
                <p className="text-sm"><span className="text-slate-500">Term: </span>Term 1, 2025</p>
                <p className="text-sm"><span className="text-slate-500">Position: </span><span className="font-bold text-teal-700">{selectedStudent.position} of {students.length}</span></p>
              </div>
            </div>

            <Separator className="mb-4" />

            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold">Subject</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Marks</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Grade</TableHead>
                  <TableHead className="text-xs font-semibold">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudent.marks.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{m.subject}</TableCell>
                    <TableCell className="text-sm text-center font-semibold">{m.marks}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={cn(
                        'text-xs',
                        m.marks >= 80 ? 'bg-green-100 text-green-700' :
                        m.marks >= 60 ? 'bg-blue-100 text-blue-700' :
                        m.marks >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>{m.grade}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{m.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Total Marks</p>
                <p className="text-lg font-bold">{selectedStudent.totalMarks}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mean Grade</p>
                <p className="text-lg font-bold text-teal-700">{selectedStudent.meanGrade}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Position</p>
                <p className="text-lg font-bold">{selectedStudent.position}/{students.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm font-medium">{format(new Date(), 'MMM d, yyyy')}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Teacher&apos;s Remarks</p>
                <p className="text-sm text-slate-700 italic">
                  {selectedStudent.meanGrade.startsWith('A')
                    ? 'Excellent performance! Keep up the good work.'
                    : selectedStudent.meanGrade.startsWith('B')
                    ? 'Good work. Continue working hard to improve further.'
                    : 'Needs improvement. More effort and dedication required.'}
                </p>
              </div>
              <div className="flex items-end justify-end">
                <div className="text-center">
                  <div className="w-32 border-t border-slate-400 pt-1 mt-16">
                    <p className="text-xs text-slate-500">Class Teacher</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Class Summary */
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Class Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-semibold">#</TableHead>
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold">Total</TableHead>
                  <TableHead className="text-xs font-semibold">Mean Grade</TableHead>
                  <TableHead className="text-xs font-semibold">Position</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-500">{s.position}</TableCell>
                    <TableCell className="text-sm font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell className="text-sm font-semibold">{s.totalMarks}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        'text-xs',
                        s.meanGrade.startsWith('A') ? 'bg-green-100 text-green-700' :
                        s.meanGrade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                        s.meanGrade.startsWith('C') ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>{s.meanGrade}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{s.position}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedStudent(s)}
                      >
                        View
                      </Button>
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
