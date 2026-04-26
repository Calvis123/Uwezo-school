'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Printer,
  Download,
  FileText,
  GraduationCap,
  Trophy,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { reportsApi, examsApi, refApi } from '@/lib/api'
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
import { cn } from '@/lib/utils'

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

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50 dark:bg-green-900/20'
  if (score >= 60) return 'bg-amber-50 dark:bg-amber-900/20'
  return 'bg-red-50 dark:bg-red-900/20'
}

interface ClassReportData {
  classInfo: {
    id: string
    name: string
    level: string
    stream: string | null
  }
  examInfo: {
    id: string
    name: string
    type: string
    totalMarks: number
    termName: string
    startDate: string
    endDate: string
  }
  subjects: Array<{
    id: string
    name: string
    code: string
    classAverage: number
    classGrade: string
  }>
  students: Array<{
    studentId: string
    admissionNumber: string
    firstName: string
    lastName: string
    fullName: string
    gender: string
    subjectMarks: Record<string, number>
    totalMarks: number
    average: number
    grade: string
    remarks: string
    subjectsTaken: number
    rank?: number
  }>
  classAverage: number
  totalStudents: number
  gradingScale: string
}

export function ClassReport() {
  const { classes } = useAppStore()
  const [localClasses, setLocalClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string>('ALL')
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined)
  const [exams, setExams] = useState<any[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined)
  const [report, setReport] = useState<ClassReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [examsLoading, setExamsLoading] = useState(false)

  const loadExams = useCallback(async (classId: string, termId?: string) => {
    if (!classId) return
    setExamsLoading(true)
    setSelectedExamId(undefined)
    setReport(null)
    try {
      const res = await examsApi.list({
        classId,
        status: 'COMPLETED',
        ...(termId && termId !== 'ALL' ? { termId } : {}),
      })
      if (res.success && res.data) {
        const examsList = Array.isArray(res.data) ? res.data : res.data.items || res.data.exams || []
        setExams(examsList)
      } else {
        setExams([])
      }
    } catch {
      setExams([])
    } finally {
      setExamsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([refApi.classes(), refApi.terms()]).then(([classesRes, termsRes]) => {
      if (!isMounted) return
      if (classesRes.success && classesRes.data) {
        setLocalClasses(Array.isArray(classesRes.data) ? classesRes.data : [])
      } else {
        setLocalClasses([])
      }
      if (termsRes.success && termsRes.data) {
        setTerms(Array.isArray(termsRes.data) ? termsRes.data : [])
      } else {
        setTerms([])
      }
    }).catch(() => {
      if (!isMounted) return
      setLocalClasses([])
      setTerms([])
    })
    return () => {
      isMounted = false
    }
  }, [])

  const loadReport = useCallback(async () => {
    if (!selectedClassId || !selectedExamId) return
    setLoading(true)
    try {
      const res = await reportsApi.classReport(selectedClassId, selectedExamId)
      if (res.success && res.data) {
        setReport(res.data)
      } else {
        toast.error(res.error || 'Failed to load report')
        setReport(null)
      }
    } catch {
      toast.error('Failed to load class report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [selectedClassId, selectedExamId])

  useEffect(() => {
    if (selectedClassId) {
      loadExams(selectedClassId, selectedTermId)
    }
  }, [selectedClassId, selectedTermId, loadExams])

  useEffect(() => {
    if (selectedClassId && selectedExamId) {
      loadReport()
    }
  }, [selectedClassId, selectedExamId, loadReport])

  const handleExportCSV = () => {
    if (!report) return

    const headers = ['Rank', 'Admission #', 'Student Name', 'Gender', ...report.subjects.map(s => s.name), 'Total', 'Average', 'Grade', 'Remarks']
    const rows = report.students.map((student) => [
      student.rank || '',
      student.admissionNumber,
      student.fullName,
      student.gender,
      ...report.subjects.map(s => student.subjectMarks[s.id] ?? ''),
      student.totalMarks,
      student.average.toFixed(1),
      student.grade,
      student.remarks,
    ])

    // Class average row
    rows.push([
      '', '', 'CLASS AVERAGE', '',
      ...report.subjects.map(s => s.classAverage.toFixed(1)),
      '',
      report.classAverage.toFixed(1),
      '',
      '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${report.classInfo.name}_${report.examInfo.name}_Report.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('CSV exported successfully')
  }

  const handlePrint = () => {
    window.print()
  }

  const mergedClasses = (localClasses.length > 0 ? localClasses : classes) || []
  const activeClasses = mergedClasses.filter((c: any) => c.status === 'ACTIVE' || !c.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Class Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and view class-level academic reports
          </p>
        </div>
        {(report) && (
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 print:hidden">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </Button>
          </div>
        )}
      </div>

      {/* Selectors */}
      <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="w-full sm:max-w-xs space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Term</label>
              <Select
                value={selectedTermId}
                onValueChange={(val) => {
                  setSelectedTermId(val)
                  setSelectedExamId(undefined)
                  setReport(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Terms</SelectItem>
                  {terms.map((term: any) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Class</label>
              <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.length === 0 && (
                    <SelectItem value="NO_CLASSES_AVAILABLE" disabled>No classes available</SelectItem>
                  )}
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}{cls.stream ? ` - Stream ${cls.stream}` : ''} ({cls.studentCount} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Exam</label>
              <Select value={selectedExamId} onValueChange={(val) => setSelectedExamId(val)} disabled={!selectedClassId || examsLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={examsLoading ? 'Loading exams...' : 'Choose an exam...'} />
                </SelectTrigger>
                <SelectContent>
                  {exams.length === 0 && (
                    <SelectItem value="NO_EXAMS_AVAILABLE" disabled>No exams available</SelectItem>
                  )}
                  {exams.map((exam: any) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} - {exam.term?.name || ''} ({exam.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}

      {/* Report Content */}
      {report && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          id="class-report-print"
        >
          {/* School Header */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 overflow-hidden print:shadow-none print:border print:border-slate-300">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white print:bg-teal-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Olives Schools</h2>
                  <p className="text-teal-100 text-sm">Eldoret, Kenya</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{report.examInfo.name}</p>
                  <p className="text-teal-100 text-xs">{report.examInfo.termName}</p>
                  <p className="text-teal-100 text-xs">
                    {format(new Date(report.examInfo.startDate), 'MMM d')} - {format(new Date(report.examInfo.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-500">Class:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{report.classInfo.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-500">Exam Type:</span>
                  <Badge variant="secondary" className="text-[10px]">{report.examInfo.type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-500">Students:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{report.totalStudents}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-500">Class Avg:</span>
                  <span className={cn('font-bold', getScoreColor(report.classAverage))}>
                    {report.classAverage.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <Card className="border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report.totalStudents}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Subjects</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{report.subjects.length}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Class Average</p>
                <p className={cn('text-2xl font-bold', getScoreColor(report.classAverage))}>{report.classAverage.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Grading Scale</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">{report.gradingScale}</p>
              </CardContent>
            </Card>
          </div>

          {/* Ranked Table */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 print:shadow-none print:border print:border-slate-300">
            <CardContent className="p-0">
              <div className="-mx-1 sm:mx-0 overflow-x-auto">
                <Table className="min-w-[860px] md:min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-700/30">
                      <TableHead className="text-xs w-12 text-center">#</TableHead>
                      <TableHead className="text-xs">Admission #</TableHead>
                      <TableHead className="text-xs">Student Name</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">Gender</TableHead>
                      {report.subjects.map((subject) => (
                        <TableHead key={subject.id} className="text-xs text-center min-w-[60px] print:min-w-[50px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-slate-400 hidden lg:block">{subject.code}</span>
                            <span className="truncate max-w-[60px]">{subject.name}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-xs text-center font-bold">Total</TableHead>
                      <TableHead className="text-xs text-center font-bold">Avg</TableHead>
                      <TableHead className="text-xs text-center">Grade</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.students.map((student, index) => (
                      <TableRow
                        key={student.studentId}
                        className={cn(
                          'hover:bg-slate-50 dark:hover:bg-slate-700/30',
                          student.rank === 1 && 'bg-amber-50/50 dark:bg-amber-900/10',
                          student.rank === 2 && 'bg-slate-50/50 dark:bg-slate-700/10',
                          student.rank === 3 && 'bg-orange-50/50 dark:bg-orange-900/10',
                        )}
                      >
                        <TableCell className="text-center">
                          {student.rank === 1 ? (
                            <Trophy className="w-4 h-4 text-amber-500 mx-auto" />
                          ) : (
                            <span className={cn(
                              'text-sm font-medium',
                              student.rank === 2 ? 'text-slate-400' : student.rank === 3 ? 'text-amber-700 dark:text-amber-500' : 'text-slate-500'
                            )}>
                              {student.rank}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">{student.admissionNumber}</TableCell>
                        <TableCell className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {student.fullName}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span
                            className={cn(
                              'text-xs',
                              student.gender === 'MALE'
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {student.gender === 'MALE' ? 'M' : 'F'}
                          </span>
                        </TableCell>
                        {report.subjects.map((subject) => {
                          const marks = student.subjectMarks[subject.id]
                          const markVal = marks ?? 0
                          return (
                            <TableCell key={subject.id} className="text-center">
                              {markVal > 0 ? (
                                <span
                                  className={cn(
                                    'text-xs font-medium tabular-nums px-1.5 py-0.5 rounded',
                                    getScoreBg(markVal),
                                    getScoreColor(markVal)
                                  )}
                                >
                                  {markVal}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 dark:text-slate-600">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {student.totalMarks}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn('text-sm font-bold tabular-nums', getScoreColor(student.average))}>
                            {student.average.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn('text-[10px]', getGradeColor(student.grade))}>
                            {student.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-slate-500">{student.remarks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Subject Averages Footer */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 print:shadow-none print:border print:border-slate-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Subject Class Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {report.subjects.map((subject) => (
                  <div key={subject.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{subject.name}</p>
                    <p className={cn('text-lg font-bold mt-1', getScoreColor(subject.classAverage))}>
                      {subject.classAverage.toFixed(1)}
                    </p>
                    <Badge className={cn('text-[10px] mt-1', getGradeColor(subject.classGrade))}>
                      {subject.classGrade}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Print footer */}
          <div className="hidden print:block text-center text-xs text-slate-500 border-t pt-4 mt-8">
            Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')} - Olives Schools Management System
            <br />
            Class: {report.classInfo.name} | Exam: {report.examInfo.name} | Term: {report.examInfo.termName} | Students: {report.totalStudents}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!selectedClassId && !report && (
        <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 print:hidden">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Select a Class to Generate Report</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Choose a class and exam to generate a comprehensive class-level academic report with rankings, grades, and subject analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedClassId && exams.length === 0 && !examsLoading && (
        <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 print:hidden">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-16 h-16 text-amber-200 dark:text-amber-900 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Completed Exams Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This class does not have any completed exams yet. Complete an exam first to generate a report.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}




