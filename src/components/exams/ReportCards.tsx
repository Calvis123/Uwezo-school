'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Printer, ArrowLeft, FileText, GraduationCap, Users, AlertCircle, Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { examsApi, refApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// CBC Grading
const LOWER_PRIMARY_GRADES = ['PP1', 'PP2', 'GRADE_1', 'GRADE_2', 'GRADE_3']
const UPPER_PRIMARY_GRADES = ['GRADE_4', 'GRADE_5', 'GRADE_6']

function getCBGrade(marks: number, classLevel: string): { grade: string; remarks: string } {
  const isLowerPrimary = LOWER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
  const isUpperPrimary = UPPER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))

  if (isLowerPrimary) {
    if (marks >= 80) return { grade: 'EE', remarks: 'Exceeding Expectations' }
    if (marks >= 65) return { grade: 'ME', remarks: 'Meeting Expectations' }
    if (marks >= 50) return { grade: 'AE', remarks: 'Approaching Expectations' }
    return { grade: 'BE', remarks: 'Below Expectations' }
  }
  if (isUpperPrimary) {
    if (marks >= 70) return { grade: '1', remarks: 'Excellent' }
    if (marks >= 60) return { grade: '2', remarks: 'Good' }
    if (marks >= 50) return { grade: '3', remarks: 'Fair' }
    return { grade: '4', remarks: 'Needs Improvement' }
  }
  if (marks >= 80) return { grade: 'A', remarks: 'Excellent' }
  if (marks >= 70) return { grade: 'B', remarks: 'Good' }
  if (marks >= 60) return { grade: 'C', remarks: 'Fair' }
  if (marks >= 50) return { grade: 'D', remarks: 'Below Average' }
  return { grade: 'E', remarks: 'Needs Improvement' }
}

function getGradeColor(grade: string): string {
  if (['EE', '1', 'A'].includes(grade)) return 'bg-green-50 text-green-700 border-green-200'
  if (['ME', '2', 'B'].includes(grade)) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (['AE', '3', 'C'].includes(grade)) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

interface SubjectMark {
  subject: string
  marks: number
  grade: string
  remarks: string
}

interface ReportStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  gender: string
  marks: SubjectMark[]
  totalMarks: number
  meanGrade: string
  meanRemarks: string
  position: number
}

interface StudentResult {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    gender: string
  }
  marks: Record<string, { marks: number; grade: string; remarks: string | null; id: string }>
  totalMarks: number
  average: number
}

export function ReportCards() {
  const { selectedExamId, classes, setCurrentView } = useAppStore()
  const [examId, setExamId] = useState(selectedExamId || '')
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [students, setStudents] = useState<ReportStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<ReportStudent | null>(null)
  const [loading, setLoading] = useState(false)
  const [localClasses, setLocalClasses] = useState(classes)
  const [examList, setExamList] = useState<any[]>([])
  const [examInfo, setExamInfo] = useState<any>(null)
  const [classLevel, setClassLevel] = useState('PRIMARY')
  const [teacherComment, setTeacherComment] = useState('')
  const [principalComment, setPrincipalComment] = useState('')
  const [printMode, setPrintMode] = useState(false)

  // Load reference data
  useEffect(() => {
    if (classes.length === 0) {
      refApi.classes().then((res) => {
        if (res.success && res.data) setLocalClasses(res.data)
      })
    } else {
      setLocalClasses(classes)
    }
  }, [classes])

  // Load exams when class is selected
  const loadExamsForClass = useCallback(async (cId: string) => {
    if (!cId) {
      setExamList([])
      return
    }
    try {
      const res = await examsApi.list({ classId: cId })
      if (res.success && res.data) {
        setExamList(res.data || [])
      }
    } catch {
      setExamList([])
    }
  }, [])

  useEffect(() => {
    if (classId) {
      loadExamsForClass(classId)
    } else {
      setExamList([])
      setExamId('')
    }
  }, [classId, loadExamsForClass])

  useEffect(() => {
    if (examId && classId) {
      loadReportCards()
    } else {
      setStudents([])
      setSelectedStudent(null)
    }
  }, [examId, classId])

  const loadReportCards = async () => {
    setLoading(true)
    try {
      const res = await examsApi.getMarks(examId)
      if (res.success && res.data) {
        const data = res.data
        setExamInfo(data.exam)
        if (data.exam?.class?.level) setClassLevel(data.exam.class.level)

        const subjectNames: any[] = data.subjects || []
        const studentResults: StudentResult[] = data.students || []

        const reportStudents: ReportStudent[] = studentResults.map((sr) => {
          const studentMarks: SubjectMark[] = subjectNames.map((sub) => {
            const markEntry = sr.marks[sub.id]
            const m = markEntry?.marks || 0
            const gradeInfo = getCBGrade(m, data.exam?.class?.level || 'PRIMARY')
            return {
              subject: sub.name || sub.code,
              marks: m,
              grade: gradeInfo.grade,
              remarks: gradeInfo.remarks,
            }
          })
          const total = studentMarks.reduce((sum, m) => sum + m.marks, 0)
          const avg = studentMarks.length > 0 ? total / studentMarks.length : 0
          const meanGradeInfo = getCBGrade(avg, data.exam?.class?.level || 'PRIMARY')

          return {
            id: sr.student.id,
            admissionNumber: sr.student.admissionNumber,
            firstName: sr.student.firstName,
            lastName: sr.student.lastName,
            gender: sr.student.gender,
            marks: studentMarks,
            totalMarks: total,
            meanGrade: meanGradeInfo.grade,
            meanRemarks: meanGradeInfo.remarks,
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
        setStudents([])
      }
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectStudent = (sId: string) => {
    if (sId === '') {
      setSelectedStudent(null)
      setStudentId('')
      return
    }
    const student = students.find((s) => s.id === sId)
    if (student) {
      setSelectedStudent(student)
      setStudentId(sId)
    }
  }

  const handlePrint = () => {
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setPrintMode(false)
    }, 100)
  }

  const getAutoComment = (student: ReportStudent): string => {
    const g = student.meanGrade
    if (['EE', '1', 'A'].includes(g)) {
      return 'Excellent performance! The learner has demonstrated outstanding understanding of the curriculum content. Keep up the exemplary work.'
    }
    if (['ME', '2', 'B'].includes(g)) {
      return 'Good work. The learner has shown commendable progress and understanding. Continue working hard to achieve even higher standards.'
    }
    if (['AE', '3', 'C'].includes(g)) {
      return 'Fair performance. The learner needs to put in more effort and practice regularly to improve their understanding and grades.'
    }
    return 'The learner needs significant improvement. Extra support and remedial teaching is recommended. Parent involvement is encouraged.'
  }

  const selectedClassName = localClasses.find(c => c.id === classId)?.name || ''
  const selectedTermName = examInfo?.term ? `${examInfo.term.name} ${examInfo.term.year}` : ''
  const examName = examInfo?.name || ''

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 h-8 px-2"
            onClick={() => setCurrentView('exams')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Report Cards</h2>
            <p className="text-xs text-slate-500">Generate and print student report cards</p>
          </div>
        </div>
        {selectedStudent && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white print:hidden"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report Card
          </Button>
        )}
      </div>

      {/* Selectors */}
      <Card className="shadow-sm border-slate-200/60 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Class</label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setExamId(''); setStudentId(''); setSelectedStudent(null) }}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {localClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Exam</label>
              <Select value={examId} onValueChange={(v) => { setExamId(v); setStudentId(''); setSelectedStudent(null) }}>
                <SelectTrigger className="w-[240px] h-9 text-sm">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {examList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.term?.name} {e.term?.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {students.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Student</label>
                <Select value={studentId} onValueChange={handleSelectStudent}>
                  <SelectTrigger className="w-[240px] h-9 text-sm">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.lastName}, {s.firstName} — {s.admissionNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!examId || !classId ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">Select Class and Exam</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Choose a class and exam to view and generate report cards for students.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : selectedStudent ? (
        /* ===== REPORT CARD VIEW ===== */
        <div id="report-card-print-area" className="print-area">
          <Card className="shadow-sm border-slate-200/60 print:shadow-none print:border-2 print:border-slate-800 print:rounded-none">
            <CardContent className="p-0 print:p-0">
              {/* School Header */}
              <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-6 py-5 print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800 print:py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="" className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center print:hidden object-contain shadow-md" />
                    <div>
                      <h1 className="text-xl font-bold tracking-tight print:text-2xl print:text-teal-800">
                        Olives Schools
                      </h1>
                      <p className="text-teal-100 text-sm print:text-slate-600 print:text-base">
                        Eldoret, Kenya
                      </p>
                      <p className="text-teal-200 text-xs mt-0.5 print:text-slate-500 print:text-sm">
                        {examName} — {selectedTermName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block print:block">
                    <p className="text-teal-200 text-xs print:text-slate-500">
                      P.O. Box 1234, Eldoret
                    </p>
                    <p className="text-teal-200 text-xs print:text-slate-500">
                      Tel: +254 700 000 000
                    </p>
                    <p className="text-xs mt-1">
                      Date: {format(new Date(), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className="px-6 py-4 bg-slate-50 print:bg-transparent print:py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Student Name</p>
                    <p className="text-sm font-semibold text-slate-900 print:text-base">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Admission No.</p>
                    <p className="text-sm font-mono font-semibold text-slate-900 print:text-base">
                      {selectedStudent.admissionNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Class</p>
                    <p className="text-sm font-semibold text-slate-900 print:text-base">{selectedClassName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Position</p>
                    <p className="text-sm font-bold text-teal-700 print:text-base print:text-teal-800">
                      {selectedStudent.position} of {students.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Marks Table */}
              <div className="px-6 py-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100 print:bg-slate-200">
                      <TableHead className="text-[11px] font-bold text-slate-700 w-8">#</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-700">Subject</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-700 text-center w-20">Marks</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-700 text-center w-16">Grade</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-700">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStudent.marks.map((m, i) => (
                      <TableRow key={i} className={cn(
                        'print:border-b print:border-slate-200',
                        i % 2 === 0 ? 'bg-white print:bg-white' : 'bg-slate-50/50 print:bg-slate-50'
                      )}>
                        <TableCell className="text-xs text-slate-500 font-medium print:text-sm">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 print:text-sm">{m.subject}</TableCell>
                        <TableCell className="text-sm text-center font-bold text-slate-900 print:text-sm print:font-bold">
                          {m.marks > 0 ? m.marks : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {m.marks > 0 ? (
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0 h-5 font-bold', getGradeColor(m.grade))}
                            >
                              {m.grade}
                            </Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 print:text-sm">{m.marks > 0 ? m.remarks : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="mx-6 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-4 print:bg-slate-100 print:rounded print:p-3">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Total Marks</p>
                    <p className="text-xl font-bold text-slate-900 print:text-lg">{selectedStudent.totalMarks}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Mean Grade</p>
                    <Badge variant="outline" className={cn('text-sm px-2.5 py-0.5 h-7 font-bold mt-1', getGradeColor(selectedStudent.meanGrade))}>
                      {selectedStudent.meanGrade}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Position</p>
                    <p className="text-xl font-bold text-teal-700 print:text-lg">
                      {selectedStudent.position}<span className="text-sm font-normal text-slate-400">/{students.length}</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold print:text-slate-500">Grade Scale</p>
                    <p className="text-xs text-slate-500 mt-1 print:text-sm">
                      {LOWER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
                        ? 'EE / ME / AE / BE'
                        : UPPER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
                          ? '1 / 2 / 3 / 4'
                          : 'A / B / C / D / E'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Teacher Comments */}
              <div className="px-6 pb-4 print:pb-3">
                <div className="space-y-2 print:space-y-1">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 print:text-sm print:font-bold">Class Teacher&apos;s Remarks</p>
                    <Textarea
                      value={teacherComment || getAutoComment(selectedStudent)}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      className="text-sm resize-none h-16 print:hidden"
                      placeholder="Enter teacher's remarks..."
                    />
                    <p className="hidden print:block print:text-sm print:italic print:text-slate-700 print:p-2 print:border print:border-slate-200 print:rounded print:bg-white">
                      {teacherComment || getAutoComment(selectedStudent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5 print:text-sm print:font-bold">Principal&apos;s Comments</p>
                    <Textarea
                      value={principalComment}
                      onChange={(e) => setPrincipalComment(e.target.value)}
                      className="text-sm resize-none h-16 print:hidden"
                      placeholder="Enter principal's comments..."
                    />
                    <p className="hidden print:block print:text-sm print:italic print:text-slate-700 print:p-2 print:border print:border-slate-200 print:rounded print:bg-white">
                      {principalComment || `Keep up the ${selectedStudent.meanGrade === 'EE' || selectedStudent.meanGrade === '1' || selectedStudent.meanGrade === 'A' ? 'excellent' : 'good'} work!`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Lines */}
              <div className="px-6 pb-6 print:pb-8">
                <Separator className="mb-6 print:mb-8" />
                <div className="grid grid-cols-2 gap-8 print:gap-16">
                  <div>
                    <div className="border-t-2 border-slate-300 pt-2 print:border-slate-800 print:border-t-[3px] print:pt-3">
                      <p className="text-xs text-slate-500 print:text-sm print:font-semibold print:text-slate-700">
                        Class Teacher
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Name: _______________________
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Date: {format(new Date(), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Signature: ___________________
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="border-t-2 border-slate-300 pt-2 print:border-slate-800 print:border-t-[3px] print:pt-3">
                      <p className="text-xs text-slate-500 print:text-sm print:font-semibold print:text-slate-700">
                        Principal
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Name: _______________________
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Date: {format(new Date(), 'dd/MM/yyyy')}
                      </p>
                      <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                        Signature: ___________________
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center print:bg-transparent print:py-2 print:border-t print:border-slate-300">
                <p className="text-[10px] text-slate-400 print:text-xs print:text-slate-500">
                  This is an official document from Olives Schools, Eldoret, Kenya.
                  {selectedStudent.totalMarks > 0 && ` Generated on ${format(new Date(), 'MMMM d, yyyy')}.`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ===== CLASS SUMMARY TABLE ===== */
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Class Performance Summary
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {students.length} students &middot; {examName} &middot; {selectedTermName}
                </p>
              </div>
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-slate-50">
                {classLevel.includes('PRE') || LOWER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
                  ? 'CBC Lower Primary'
                  : UPPER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
                    ? 'CBC Upper Primary'
                    : 'Standard'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No students found with marks for this exam</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-600 w-12">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Student Name</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center w-16">Adm No.</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center w-20">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center w-20">Mean</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center w-16">Grade</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center w-16">Position</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s, i) => (
                      <TableRow key={s.id} className={cn(
                        'hover:bg-teal-50/50 cursor-pointer transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      )}>
                        <TableCell className="text-sm text-slate-400 font-medium">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">
                          {s.lastName}, {s.firstName}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 font-mono text-center">{s.admissionNumber}</TableCell>
                        <TableCell className="text-sm font-bold text-slate-900 text-center">{s.totalMarks}</TableCell>
                        <TableCell className="text-sm text-center text-slate-700">
                          {s.marks.length > 0 ? (s.totalMarks / s.marks.length).toFixed(1) : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] font-bold px-1.5 py-0 h-5', getGradeColor(s.meanGrade))}
                          >
                            {s.meanGrade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-center text-slate-700">{s.position}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50 hover:border-teal-200"
                            onClick={() => handleSelectStudent(s.id)}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            View Card
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Print-specific Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything except the report card */
          body > *:not(#report-card-print-area) {
            display: none !important;
          }
          /* Show the report card */
          #report-card-print-area {
            display: block !important;
          }
          /* Hide non-print elements */
          .print\\:hidden {
            display: none !important;
          }
          /* Ensure full width */
          @page {
            size: A4;
            margin: 10mm;
          }
          .print-area {
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
