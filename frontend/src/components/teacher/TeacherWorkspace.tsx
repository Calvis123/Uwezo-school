'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CalendarCheck2, ClipboardList, GraduationCap, Users } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { examsApi, studentsApi, teacherApi, attendanceApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AssignedClass {
  id: string
  name: string
  level: string
  stream?: string | null
  studentCount: number
  attendanceRate?: number
  averageScore?: number
}

export function TeacherWorkspace() {
  const { user, navigateTo } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<AssignedClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [studentsCount, setStudentsCount] = useState(0)
  const [examCount, setExamCount] = useState(0)
  const [attendanceRate, setAttendanceRate] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'exams'>('overview')

  useEffect(() => {
    if (!user?.id) return
    loadWorkspace()
  }, [user?.id])

  useEffect(() => {
    if (!selectedClassId) return
    loadClassDetails(selectedClassId)
  }, [selectedClassId])

  const loadWorkspace = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await teacherApi.classes(user.id)
      if (res.success && res.data) {
        const assigned: AssignedClass[] = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any).classes)
            ? (res.data as any).classes
            : []
        setClasses(assigned)
        setSelectedClassId(assigned[0]?.id || '')
      } else {
        setClasses([])
        setSelectedClassId('')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadClassDetails = async (classId: string) => {
    try {
      const [studentsRes, examsRes, attendanceRes] = await Promise.all([
        studentsApi.list({ classId, status: 'ACTIVE', limit: 200 }),
        examsApi.list({ classId }),
        attendanceApi.stats({ classId }),
      ])

      setStudentsCount(studentsRes.success && studentsRes.data ? studentsRes.data.total || 0 : 0)
      setExamCount(examsRes.success && examsRes.data ? (examsRes.data as any[]).length : 0)

      if (attendanceRes.success && attendanceRes.data?.overall) {
        setAttendanceRate(attendanceRes.data.overall.attendanceRate || 0)
      } else {
        setAttendanceRate(0)
      }
    } catch {
      setStudentsCount(0)
      setExamCount(0)
      setAttendanceRate(0)
    }
  }

  const selectedClass = useMemo(
    () => classes.find((cls) => cls.id === selectedClassId),
    [classes, selectedClassId]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="py-16 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No assigned classes</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ask admin/headteacher to assign your class.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-600 text-white"
      >
        <p className="text-sm text-indigo-100">Teacher Workspace</p>
        <h2 className="text-xl font-bold mt-1">{selectedClass?.name || 'My Class'}</h2>
        <p className="text-xs text-indigo-100 mt-1">
          Focused class operations for attendance, students and exams.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assigned Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition',
                  selectedClassId === cls.id
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                )}
              >
                <p className="text-sm font-semibold">{cls.name}</p>
                <p className="text-[11px] opacity-80">{cls.studentCount} students</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Students</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{studentsCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Exams</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{examCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Attendance</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{attendanceRate.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'students' | 'attendance' | 'exams')}>
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="students">Students</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="exams">Exams</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    You are working in <span className="font-semibold">{selectedClass?.name}</span>. Everything below is class-scoped.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Class: {selectedClass?.name}</Badge>
                    <Badge variant="secondary">Students: {studentsCount}</Badge>
                    <Badge variant="secondary">Attendance: {attendanceRate.toFixed(1)}%</Badge>
                  </div>
                </TabsContent>

                <TabsContent value="students">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-300">View only students in this class.</p>
                    <Button size="sm" onClick={() => navigateTo('students', { classId: selectedClassId })}>
                      Open Students
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="attendance">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Mark and review attendance for this class.</p>
                    <Button size="sm" onClick={() => navigateTo('attendance', { classId: selectedClassId })}>
                      Open Attendance
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="exams">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Enter marks and review exams for this class.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigateTo('mark-entry', { classId: selectedClassId })}>
                        <ClipboardList className="w-4 h-4 mr-1" />
                        Mark Entry
                      </Button>
                      <Button size="sm" onClick={() => navigateTo('exams', { classId: selectedClassId })}>
                        Open Exams
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
