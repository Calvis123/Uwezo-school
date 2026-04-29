'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Save, Loader2, AlertCircle, CheckCircle2, Users, BookOpen, ArrowLeft } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { examsApi, teacherApi } from '@/lib/api'
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
import { cn } from '@/lib/utils'

// CBC Grade Scales
const LOWER_PRIMARY_GRADES = ['PP1', 'PP2', 'GRADE_1', 'GRADE_2', 'GRADE_3']
const UPPER_PRIMARY_GRADES = ['GRADE_4', 'GRADE_5', 'GRADE_6']

function getCBGrade(marks: number, classLevel: string): { grade: string; label: string } {
  const isLowerPrimary = LOWER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))
  const isUpperPrimary = UPPER_PRIMARY_GRADES.some(l => classLevel.toUpperCase().includes(l))

  if (isLowerPrimary) {
    // Pre-primary/lower primary grading
    if (marks >= 80) return { grade: 'EE', label: 'Exceeding Expectations' }
    if (marks >= 65) return { grade: 'ME', label: 'Meeting Expectations' }
    if (marks >= 50) return { grade: 'AE', label: 'Approaching Expectations' }
    return { grade: 'BE', label: 'Below Expectations' }
  }

  if (isUpperPrimary) {
    // Upper primary grading (1-4)
    if (marks >= 70) return { grade: '1', label: 'Excellent' }
    if (marks >= 60) return { grade: '2', label: 'Good' }
    if (marks >= 50) return { grade: '3', label: 'Fair' }
    return { grade: '4', label: 'Needs Improvement' }
  }

  // Default ABC grading for other levels
  if (marks >= 80) return { grade: 'A', label: 'Excellent' }
  if (marks >= 70) return { grade: 'B', label: 'Good' }
  if (marks >= 60) return { grade: 'C', label: 'Fair' }
  if (marks >= 50) return { grade: 'D', label: 'Below Average' }
  return { grade: 'E', label: 'Needs Improvement' }
}

function getGradeColor(grade: string): string {
  if (['EE', '1', 'A'].includes(grade)) return 'bg-green-50 text-green-700 border-green-200'
  if (['ME', '2', 'B'].includes(grade)) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (['AE', '3', 'C'].includes(grade)) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

interface StudentResult {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
  }
  marks: Record<string, { marks: number; grade: string; remarks: string | null; id: string }>
  totalMarks: number
  average: number
}

interface Subject {
  id: string
  name: string
  code: string
  level: string
}

function getClassLabel(cls?: { name?: string | null; stream?: string | null }) {
  if (!cls?.name) return ''
  if (!cls.stream) return cls.name
  if (new RegExp(`\\s+${cls.stream}$`, 'i').test(cls.name)) return cls.name
  return `${cls.name} ${cls.stream}`
}

export function MarkEntry() {
  const { selectedExamId, selectedClassId, setCurrentView, user } = useAppStore()
  const isTeacherView = user?.role === 'TEACHER'
  const [examId, setExamId] = useState(selectedExamId || '')
  const [examList, setExamList] = useState<any[]>([])
  const [students, setStudents] = useState<StudentResult[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [classLevel, setClassLevel] = useState('PRIMARY')
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadExams = async () => {
    try {
      let classIds: string[] = []
      let scopedClassId = ''
      if (isTeacherView) {
        const classesRes = await teacherApi.classes()
        if (classesRes.success && classesRes.data) {
          const teacherClasses = Array.isArray(classesRes.data) ? classesRes.data : []
          classIds = teacherClasses.map((c: any) => c.id)
          scopedClassId = selectedClassId && classIds.includes(selectedClassId)
            ? selectedClassId
            : classIds.length === 1
              ? classIds[0]
              : ''
        }
      } else {
        scopedClassId = selectedClassId || ''
      }

      const res = await examsApi.list(scopedClassId ? { classId: scopedClassId } : undefined)
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : []
        const allowedClassIds = scopedClassId ? [scopedClassId] : classIds
        const scopedList = allowedClassIds.length > 0
          ? list.filter((exam: any) => allowedClassIds.includes(exam.classId))
          : list
        setExamList(scopedList)

        if (!examId && scopedList.length > 0) {
          const activeExam = scopedList.find((exam: any) => exam.status === 'ACTIVE')
          setExamId(activeExam?.id || scopedList[0].id)
        } else if (examId && !scopedList.some((exam: any) => exam.id === examId)) {
          setExamId('')
        }
      } else {
        setExamList([])
      }
    } catch {
      setExamList([])
    }
  }

  useEffect(() => {
    loadExams()
  }, [isTeacherView, selectedClassId])

  useEffect(() => {
    if (examId) {
      loadMarks()
    } else {
      setLoading(false)
      setStudents([])
      setSubjects([])
      setMarks({})
    }
  }, [examId])

  const loadMarks = async () => {
    setLoading(true)
    try {
      const res = await examsApi.getMarks(examId)
      if (res.success && res.data) {
        const data = res.data
        setStudents(data.students || [])
        const fetchedSubjects = data.subjects || []
        setSubjects(fetchedSubjects)
        if (data.exam?.class?.level) {
          setClassLevel(data.exam.class.level)
        }

        // Build marks map from API data
        const marksMap: Record<string, string> = {}
        data.students?.forEach((s: StudentResult) => {
          fetchedSubjects.forEach((sub: Subject) => {
            const markEntry = s.marks[sub.id]
            if (markEntry && markEntry.marks > 0) {
              marksMap[`${s.student.id}-${sub.id}`] = String(markEntry.marks)
            }
          })
        })
        setMarks(marksMap)
      } else {
        setStudents([])
        setSubjects([])
        setMarks({})
      }
    } catch {
      setStudents([])
      setSubjects([])
      setMarks({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleMarkChange = useCallback((studentId: string, subjectId: string, value: string) => {
    setMarks((prev) => ({ ...prev, [`${studentId}-${subjectId}`]: value }))
    setSaveStatus('idle')

    // Auto-save debounce
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      autoSave()
    }, 1500)
  }, [examId, students, subjects])

  const autoSave = async () => {
    if (!examId) return
    setSaving(true)
    setSaveStatus('saving')
    try {
      const marksArray: { studentId: string; subjectId: string; marks: number }[] = []
      students.forEach((s) => {
        subjects.forEach((sub) => {
          const key = `${s.student.id}-${sub.id}`
          const val = marks[key]
          if (val !== undefined && val !== '') {
            const num = Number(val)
            if (!isNaN(num) && num >= 0 && num <= 100) {
              marksArray.push({ studentId: s.student.id, subjectId: sub.id, marks: num })
            }
          }
        })
      })

      if (marksArray.length === 0) {
        setSaving(false)
        setSaveStatus('idle')
        return
      }

      const result = await examsApi.saveMarks({ examId, marks: marksArray })
      if (result.success) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAll = async () => {
    if (!examId) {
      toast.error('Please select an exam')
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await autoSave()
    if (saveStatus !== 'error') {
      toast.success('Marks saved successfully')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string, subjectId: string) => {
    const studentIds = students.map(s => s.student.id)
    const subjectIds = subjects.map(s => s.id)
    const currentStudentIdx = studentIds.indexOf(studentId)
    const currentSubjectIdx = subjectIds.indexOf(subjectId)

    if (e.key === 'Enter' || e.key === 'Tab') {
      // Move to next student in same subject, or next subject
      if (currentStudentIdx < studentIds.length - 1) {
        e.preventDefault()
        const nextStudent = studentIds[currentStudentIdx + 1]
        const nextInput = document.getElementById(`mark-${nextStudent}-${subjectId}`)
        nextInput?.focus()
        nextInput?.select()
      }
    } else if (e.key === 'ArrowDown' && currentStudentIdx < studentIds.length - 1) {
      e.preventDefault()
      const nextStudent = studentIds[currentStudentIdx + 1]
      const nextInput = document.getElementById(`mark-${nextStudent}-${subjectId}`)
      nextInput?.focus()
      nextInput?.select()
    } else if (e.key === 'ArrowUp' && currentStudentIdx > 0) {
      e.preventDefault()
      const prevStudent = studentIds[currentStudentIdx - 1]
      const prevInput = document.getElementById(`mark-${prevStudent}-${subjectId}`)
      prevInput?.focus()
      prevInput?.select()
    }
  }

  const getMarkValue = (studentId: string, subjectId: string): number => {
    const key = `${studentId}-${subjectId}`
    const val = marks[key]
    if (val === undefined || val === '') return 0
    return Number(val)
  }

  const isValidMark = (value: string): boolean => {
    if (value === '' || value === undefined) return true
    const num = Number(value)
    return !isNaN(num) && num >= 0 && num <= 100
  }

  const getStudentTotal = (studentId: string): number => {
    return subjects.reduce((sum, sub) => sum + getMarkValue(studentId, sub.id), 0)
  }

  const getStudentAverage = (studentId: string): number => {
    if (subjects.length === 0) return 0
    const total = getStudentTotal(studentId)
    return Math.round((total / subjects.length) * 10) / 10
  }

  const getSubjectAverage = (subjectId: string): string => {
    const total = students.reduce((sum, s) => sum + getMarkValue(s.student.id, subjectId), 0)
    if (students.length === 0) return '—'
    const avg = total / students.length
    return avg.toFixed(1)
  }

  const getTotalAverage = (): string => {
    const grandTotal = students.reduce((sum, s) => sum + getStudentTotal(s.student.id), 0)
    if (students.length === 0) return '—'
    return (grandTotal / students.length).toFixed(1)
  }

  const filledCount = Object.values(marks).filter(v => v !== '' && v !== undefined).length
  const totalCells = students.length * subjects.length

  return (
    <div className="space-y-4">
      {/* Header */}
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
            <h2 className="text-lg font-semibold text-slate-900">Mark Entry</h2>
            {examId && (
              <p className="text-xs text-slate-500">
                {students.length} students &middot; {subjects.length} subjects
                {filledCount > 0 && ` &middot; ${filledCount}/${totalCells} marks entered`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Save Status Indicator */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 text-xs text-teal-600 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              Save failed
            </div>
          )}
          {examId && (
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSaveAll}
              disabled={saving}
              size="sm"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Marks
            </Button>
          )}
        </div>
      </div>

      {/* Exam Selector */}
      <Card className="shadow-sm border-slate-200/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">Select Exam:</Label>
            <Select value={examId} onValueChange={setExamId}>
              <SelectTrigger className="w-full sm:w-80 h-10">
                <SelectValue placeholder="Choose an exam to enter marks" />
              </SelectTrigger>
              <SelectContent>
                {examList.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} {getClassLabel(e.class) ? `(${getClassLabel(e.class)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {examId && (
              <Badge variant="outline" className={cn('text-xs px-2 py-0.5',
                classLevel.includes('PRE') || classLevel.includes('GRADE_1') || classLevel.includes('GRADE_2') || classLevel.includes('GRADE_3')
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : classLevel.includes('GRADE_4') || classLevel.includes('GRADE_5') || classLevel.includes('GRADE_6')
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
              )}>
                {classLevel.includes('PRE') || classLevel.includes('GRADE_1') || classLevel.includes('GRADE_2') || classLevel.includes('GRADE_3')
                  ? 'CBC Lower Primary (EE/ME/AE/BE)'
                  : classLevel.includes('GRADE_4') || classLevel.includes('GRADE_5') || classLevel.includes('GRADE_6')
                    ? 'CBC Upper Primary (1-4)'
                    : 'Standard Grading (A-E)'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!examId ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No Exam Selected</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Select an exam from the dropdown above to begin entering marks. Marks are auto-saved as you type.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        /* Mark Entry Grid */
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-fit">
              {/* Header Row */}
              <div
                className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-3 py-2.5"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(180px, 220px) repeat(${subjects.length}, minmax(100px, 120px)) minmax(80px, 100px) minmax(80px, 100px)`,
                  gap: '0',
                }}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pr-3 flex items-center">
                  Student Name
                </div>
                {subjects.map((sub) => (
                  <div key={sub.id} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center px-1.5">
                    <div>{sub.code}</div>
                    <div className="text-[10px] font-normal text-slate-400 normal-case">{sub.name}</div>
                  </div>
                ))}
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center px-1.5">
                  Total
                </div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center px-1.5">
                  Avg / Grade
                </div>
              </div>

              {/* Student Rows */}
              {students.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No students found for this exam&apos;s class</p>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  {students.map((studentResult, idx) => {
                    const { student } = studentResult
                    const total = getStudentTotal(student.id)
                    const avg = getStudentAverage(student.id)
                    const gradeInfo = getCBGrade(avg, classLevel)

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          'border-b border-slate-100 px-3 py-1.5 transition-colors',
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                          'hover:bg-teal-50/50'
                        )}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `minmax(180px, 220px) repeat(${subjects.length}, minmax(100px, 120px)) minmax(80px, 100px) minmax(80px, 100px)`,
                          gap: '0',
                        }}
                      >
                        {/* Student Name */}
                        <div className="flex items-center pr-3 min-w-0 gap-2">
                          <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {student.lastName}, {student.firstName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{student.admissionNumber}</div>
                          </div>
                        </div>

                        {/* Subject Marks */}
                        {subjects.map((sub) => {
                          const key = `${student.id}-${sub.id}`
                          const value = marks[key] || ''
                          const markNum = getMarkValue(student.id, sub.id)
                          const gradeInfo = markNum > 0 ? getCBGrade(markNum, classLevel) : null
                          const valid = isValidMark(value)

                          return (
                            <div key={sub.id} className="flex flex-col items-center justify-center px-1.5">
                              <Input
                                id={`mark-${student.id}-${sub.id}`}
                                type="number"
                                min="0"
                                max="100"
                                value={value}
                                onChange={(e) => handleMarkChange(student.id, sub.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, student.id, sub.id)}
                                className={cn(
                                  'h-7 w-full text-sm text-center px-1 font-mono tabular-nums',
                                  'focus:ring-1 focus:ring-teal-500 focus:border-teal-500',
                                  'remove-spinner',
                                  !valid && value !== '' && 'border-red-400 focus:border-red-500 focus:ring-red-500'
                                )}
                                placeholder="—"
                              />
                              {gradeInfo && (
                                <span className={cn(
                                  'text-[9px] font-semibold mt-0.5 leading-none',
                                  markNum >= 80 ? 'text-green-600' :
                                  markNum >= 60 ? 'text-blue-600' :
                                  markNum >= 50 ? 'text-amber-600' :
                                  'text-red-600'
                                )}>
                                  {gradeInfo.grade}
                                </span>
                              )}
                            </div>
                          )
                        })}

                        {/* Total */}
                        <div className="flex items-center justify-center">
                          <span className={cn(
                            'text-sm font-bold tabular-nums',
                            total > 0 ? 'text-slate-900' : 'text-slate-300'
                          )}>
                            {total || '—'}
                          </span>
                        </div>

                        {/* Average / Grade */}
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={cn(
                            'text-sm font-bold tabular-nums',
                            avg > 0 ? 'text-slate-900' : 'text-slate-300'
                          )}>
                            {avg > 0 ? avg.toFixed(1) : '—'}
                          </span>
                          {avg > 0 && (
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] px-1.5 py-0 h-4', getGradeColor(gradeInfo.grade))}
                            >
                              {gradeInfo.grade}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Summary Row */}
              {students.length > 0 && subjects.length > 0 && (
                <div
                  className="sticky bottom-0 z-10 bg-teal-50 border-t-2 border-teal-200 px-3 py-2.5"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `minmax(180px, 220px) repeat(${subjects.length}, minmax(100px, 120px)) minmax(80px, 100px) minmax(80px, 100px)`,
                    gap: '0',
                  }}
                >
                  <div className="flex items-center pr-3">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      Class Average
                    </span>
                  </div>
                  {subjects.map((sub) => (
                    <div key={sub.id} className="flex flex-col items-center justify-center px-1.5">
                      <span className="text-xs font-bold text-teal-700 tabular-nums">
                        {getSubjectAverage(sub.id)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-center">
                    <span className="text-xs font-bold text-teal-700 tabular-nums">
                      {getTotalAverage()}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Badge variant="outline" className="text-[9px] bg-teal-100 text-teal-800 border-teal-300 px-1.5 py-0 h-4 font-semibold">
                      AVG
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyboard shortcuts info */}
      {examId && students.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">↓</kbd> Navigate rows</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">Enter</kbd> Next student</span>
          <span>Auto-saves after 1.5s</span>
        </div>
      )}

      {/* Custom CSS for number inputs */}
      <style jsx global>{`
        .remove-spinner::-webkit-outer-spin-button,
        .remove-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .remove-spinner[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  )
}
