'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Save, Loader2, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { examsApi } from '@/lib/api'
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

export function MarkEntry() {
  const { selectedExamId, classes, exams, setCurrentView } = useAppStore()
  const [examId, setExamId] = useState(selectedExamId || '')
  const [students, setStudents] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [examList, setExamList] = useState<any[]>([])

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const res = await examsApi.list({ status: 'ACTIVE' })
      if (res.success && res.data) {
        setExamList(res.data || [])
      } else {
        setExamList([
          { id: '1', name: 'Term 1 End Term - Grade 4', classId: '1', class: { name: 'Grade 4' } },
          { id: '2', name: 'Term 1 End Term - Grade 5', classId: '2', class: { name: 'Grade 5' } },
          { id: '3', name: 'Term 1 CAT 2 - Grade 4', classId: '1', class: { name: 'Grade 4' } },
        ])
      }
    } catch {
      setExamList([])
    }
  }

  useEffect(() => {
    if (examId) {
      loadMarks()
    } else {
      setLoading(false)
    }
  }, [examId])

  const loadMarks = async () => {
    setLoading(true)
    try {
      const res = await examsApi.getMarks(examId)
      if (res.success && res.data) {
        setStudents(res.data.students || [])
        setSubjects(res.data.subjects || [])
        const marksMap: Record<string, number> = {}
        res.data.marks?.forEach((m: any) => {
          marksMap[`${m.studentId}-${m.subjectId}`] = m.marks
        })
        setMarks(marksMap)
      } else {
        // Demo data
        const demoStudents = [
          { id: 's1', firstName: 'John', lastName: 'Kamau', admissionNumber: 'ADM-001' },
          { id: 's2', firstName: 'Mary', lastName: 'Wanjiku', admissionNumber: 'ADM-002' },
          { id: 's3', firstName: 'Peter', lastName: 'Ochieng', admissionNumber: 'ADM-003' },
          { id: 's4', firstName: 'Grace', lastName: 'Akinyi', admissionNumber: 'ADM-004' },
          { id: 's5', firstName: 'David', lastName: 'Mwangi', admissionNumber: 'ADM-005' },
          { id: 's6', firstName: 'Sarah', lastName: 'Njeri', admissionNumber: 'ADM-006' },
          { id: 's7', firstName: 'James', lastName: 'Otieno', admissionNumber: 'ADM-007' },
          { id: 's8', firstName: 'Ann', lastName: 'Muthoni', admissionNumber: 'ADM-008' },
        ]
        const demoSubjects = [
          { id: 'sub1', name: 'Mathematics', code: 'MATH' },
          { id: 'sub2', name: 'English', code: 'ENG' },
          { id: 'sub3', name: 'Kiswahili', code: 'KIS' },
          { id: 'sub4', name: 'Science', code: 'SCI' },
          { id: 'sub5', name: 'Social Studies', code: 'SST' },
        ]
        setStudents(demoStudents)
        setSubjects(demoSubjects)
        const demoMarks: Record<string, number> = {}
        demoStudents.forEach((s) => {
          demoSubjects.forEach((sub) => {
            demoMarks[`${s.id}-${sub.id}`] = Math.round(40 + Math.random() * 55)
          })
        })
        setMarks(demoMarks)
      }
    } catch {
      setStudents([])
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    const num = value === '' ? 0 : Math.min(100, Math.max(0, Number(value)))
    setMarks((prev) => ({ ...prev, [`${studentId}-${subjectId}`]: num }))
  }

  const handleSave = async () => {
    if (!examId) {
      toast.error('Please select an exam')
      return
    }
    setSaving(true)
    try {
      const marksArray = Object.entries(marks).map(([key, marks]) => {
        const [studentId, subjectId] = key.split('-')
        return { studentId, subjectId, marks }
      })
      const result = await examsApi.saveMarks({ examId, marks: marksArray })
      if (result.success) {
        toast.success('Marks saved successfully')
      } else {
        toast.error(result.error || 'Failed to save marks')
      }
    } catch {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const getStudentTotal = (studentId: string) => {
    return subjects.reduce((sum, sub) => sum + (marks[`${studentId}-${sub.id}`] || 0), 0)
  }

  const getStudentAverage = (studentId: string) => {
    if (subjects.length === 0) return 0
    return Math.round(getStudentTotal(studentId) / subjects.length)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={examId} onValueChange={setExamId}>
            <SelectTrigger className="w-full sm:w-72 h-10">
              <SelectValue placeholder="Select an exam" />
            </SelectTrigger>
            <SelectContent>
              {examList.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} {e.class?.name ? `(${e.class.name})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {examId && (
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Marks
          </Button>
        )}
      </div>

      {!examId ? (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select an exam to begin entering marks</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm border-slate-200/60">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid sticky top-0 bg-slate-50 border-b border-slate-200 px-4 py-3 gap-0" style={{ gridTemplateColumns: `200px repeat(${subjects.length}, 80px) 100px 100px` }}>
                <div className="text-xs font-semibold text-slate-600 pr-2">Student</div>
                {subjects.map((sub) => (
                  <div key={sub.id} className="text-xs font-semibold text-slate-600 text-center px-1">
                    {sub.code}
                  </div>
                ))}
                <div className="text-xs font-semibold text-slate-600 text-center px-1">Total</div>
                <div className="text-xs font-semibold text-slate-600 text-center px-1">Grade</div>
              </div>

              {/* Student Rows */}
              {students.map((student) => {
                const total = getStudentTotal(student.id)
                const avg = getStudentAverage(student.id)
                const grade = getGrade(avg)
                return (
                  <div
                    key={student.id}
                    className="grid border-b border-slate-100 px-4 py-2 gap-0 hover:bg-slate-50 transition-colors"
                    style={{ gridTemplateColumns: `200px repeat(${subjects.length}, 80px) 100px 100px` }}
                  >
                    <div className="flex items-center pr-2 min-w-0">
                      <div className="text-sm font-medium truncate">{student.firstName} {student.lastName}</div>
                    </div>
                    {subjects.map((sub) => {
                      const key = `${student.id}-${sub.id}`
                      const mark = marks[key] || 0
                      return (
                        <div key={sub.id} className="px-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={mark || ''}
                            onChange={(e) => handleMarkChange(student.id, sub.id, e.target.value)}
                            className="h-8 text-sm text-center px-1"
                            placeholder="—"
                          />
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-semibold">{total}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Badge variant="secondary" className={cn(
                        'text-xs',
                        avg >= 80 ? 'bg-green-100 text-green-700' :
                        avg >= 60 ? 'bg-blue-100 text-blue-700' :
                        avg >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {grade}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
