import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'
import { buildStyledExportPdf } from '@/lib/export-pdf'

type AcademicReportType =
  | 'student-performance'
  | 'exam-results'
  | 'class-performance'
  | 'whole-school-performance'
  | 'subject-performance'
  | 'student-rankings'
  | 'national-internal-analysis'
  | 'teacher-performance'
  | 'attendance-summary'
  | 'staff-attendance'
  | 'staff-management'
  | 'admissions-enrollment'
  | 'discipline-welfare'
  | 'timetable'
  | 'follow-up'
type ExportFormat = 'csv' | 'xls' | 'pdf'

type ExportHistoryEntry = {
  id: string
  category: 'ACADEMIC'
  reportType: AcademicReportType
  format: ExportFormat
  userId: string
  userName: string
  role: string
  filters: {
    classId: string | null
  }
  rowCount: number
  createdAt: string
}

const EXPORT_HISTORY_KEY = 'export_history'
const ACADEMIC_EXPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS'] as const

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function csvEscape(value: string | number) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function toCsv(headers: string[], rows: Array<Record<string, string | number>>, keys: string[]) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => keys.map((k) => csvEscape(row[k] ?? '')).join(',')),
  ]
  return lines.join('\n')
}

function toXlsHtml(headers: string[], rows: Array<Record<string, string | number>>, keys: string[]) {
  const escapeHtml = (v: string | number) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <table border="1">
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows
          .map((r) => `<tr>${keys.map((k) => `<td>${escapeHtml(r[k] ?? '')}</td>`).join('')}</tr>`)
          .join('')}
      </tbody>
    </table>
  </body></html>`
}

async function toPdf(
  title: string,
  headers: string[],
  rows: Array<Record<string, string | number>>,
  keys: string[],
  stamp: string
) {
  return buildStyledExportPdf({
    title,
    headers,
    rows,
    keys,
    stamp,
    maxRows: 700,
  })
}

async function readExportHistory(): Promise<ExportHistoryEntry[]> {
  const setting = await db.systemSetting.findUnique({
    where: { key: EXPORT_HISTORY_KEY },
    select: { value: true },
  })
  if (!setting?.value) return []
  try {
    const parsed = JSON.parse(setting.value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeExportHistory(entries: ExportHistoryEntry[]) {
  await db.systemSetting.upsert({
    where: { key: EXPORT_HISTORY_KEY },
    update: { value: JSON.stringify(entries) },
    create: { key: EXPORT_HISTORY_KEY, value: JSON.stringify(entries) },
  })
}

async function logExport(entry: ExportHistoryEntry) {
  try {
    const existing = await readExportHistory()
    existing.unshift(entry)
    await writeExportHistory(existing.slice(0, 2000))
  } catch {
    // Logging should never block export.
  }
}

function buildStudentExamRanking(
  marks: Array<{ examId: string; studentId: string; marks: number }>
) {
  const totalsByExamStudent = new Map<string, number>()
  for (const mark of marks) {
    const key = `${mark.examId}::${mark.studentId}`
    totalsByExamStudent.set(key, (totalsByExamStudent.get(key) || 0) + Number(mark.marks || 0))
  }

  const grouped = new Map<string, Array<{ studentId: string; total: number }>>()
  for (const [key, total] of totalsByExamStudent.entries()) {
    const [examId, studentId] = key.split('::')
    if (!grouped.has(examId)) grouped.set(examId, [])
    grouped.get(examId)!.push({ studentId, total })
  }

  const rankMap = new Map<string, number>()
  for (const [examId, entries] of grouped.entries()) {
    entries.sort((a, b) => b.total - a.total)
    entries.forEach((entry, index) => {
      rankMap.set(`${examId}::${entry.studentId}`, index + 1)
    })
  }
  return rankMap
}

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ACADEMIC_EXPORT_ROLES] })
    const { searchParams } = new URL(request.url)

    const reportType = (searchParams.get('reportType') || 'student-performance').toLowerCase() as AcademicReportType
    const classId = searchParams.get('classId')
    const format = (searchParams.get('format') || 'csv').toLowerCase() as ExportFormat

    if (
      ![
        'student-performance',
        'exam-results',
        'class-performance',
        'whole-school-performance',
        'subject-performance',
        'student-rankings',
        'national-internal-analysis',
        'teacher-performance',
        'attendance-summary',
        'staff-attendance',
        'staff-management',
        'admissions-enrollment',
        'discipline-welfare',
        'timetable',
        'follow-up',
      ].includes(reportType)
    ) {
      return NextResponse.json({ success: false, error: 'Invalid reportType' }, { status: 400 })
    }
    if (!['csv', 'xls', 'excel', 'pdf'].includes(format)) {
      return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 })
    }

    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, year: true, startDate: true, endDate: true },
    })
    if (!activeTerm) {
      return NextResponse.json({ success: false, error: 'No active term found for export' }, { status: 400 })
    }

    const stamp = new Date().toISOString().slice(0, 10)
    let headers: string[] = []
    let keys: string[] = []
    let rows: Array<Record<string, string | number>> = []
    let filename = `academic-export-${stamp}`
    let title = 'Academic Export'

    if (reportType === 'student-performance' || reportType === 'exam-results') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          exam: { include: { class: true } },
          student: true,
          subject: true,
        },
        orderBy: [{ exam: { class: { name: 'asc' } } }, { exam: { name: 'asc' } }, { student: { lastName: 'asc' } }],
      })

      const rankMap = buildStudentExamRanking(
        marks.map((m) => ({ examId: m.examId, studentId: m.studentId, marks: Number(m.marks || 0) }))
      )

      if (reportType === 'student-performance') {
        rows = marks.map((m) => ({
          studentName: `${m.student.firstName} ${m.student.lastName}`,
          admissionNo: m.student.admissionNumber,
          className: m.exam.class?.name || '',
          examName: m.exam.name,
          subject: m.subject.name,
          marks: Number(m.marks || 0),
          grade: m.grade || '',
          position: rankMap.get(`${m.examId}::${m.studentId}`) || '',
          teacherComments: m.remarks || '',
        }))
        headers = ['Student Name', 'Admission No', 'Class', 'Exam', 'Subject', 'Marks', 'Grade', 'Position', 'Teacher Comments']
        keys = ['studentName', 'admissionNo', 'className', 'examName', 'subject', 'marks', 'grade', 'position', 'teacherComments']
        filename = `student-academic-performance-${stamp}`
        title = 'Student Academic Performance Report'
      } else {
        const grouped = new Map<
          string,
          {
            examName: string
            examType: string
            className: string
            studentName: string
            admissionNo: string
            subjects: number
            total: number
          }
        >()
        for (const m of marks) {
          const key = `${m.examId}::${m.studentId}`
          if (!grouped.has(key)) {
            grouped.set(key, {
              examName: m.exam.name,
              examType: m.exam.type,
              className: m.exam.class?.name || '',
              studentName: `${m.student.firstName} ${m.student.lastName}`,
              admissionNo: m.student.admissionNumber,
              subjects: 0,
              total: 0,
            })
          }
          const entry = grouped.get(key)!
          entry.subjects += 1
          entry.total += Number(m.marks || 0)
        }
        rows = Array.from(grouped.entries()).map(([key, value]) => {
          const [examId, studentId] = key.split('::')
          const avg = value.subjects > 0 ? Math.round((value.total / value.subjects) * 100) / 100 : 0
          return {
            examName: value.examName,
            examType: value.examType,
            className: value.className,
            studentName: value.studentName,
            admissionNo: value.admissionNo,
            subjects: value.subjects,
            totalMarks: value.total,
            average: avg,
            position: rankMap.get(`${examId}::${studentId}`) || '',
          }
        })
        headers = ['Exam', 'Type', 'Class', 'Student', 'Admission No', 'Subjects', 'Total Marks', 'Average', 'Position']
        keys = ['examName', 'examType', 'className', 'studentName', 'admissionNo', 'subjects', 'totalMarks', 'average', 'position']
        filename = `exam-results-${stamp}`
        title = 'Exam Results Export'
      }
    }

    if (reportType === 'class-performance') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          exam: { include: { class: true } },
          subject: true,
        },
      })

      const grouped = new Map<
        string,
        { className: string; marks: number[]; pass: number; fail: number; subjectTotals: Record<string, { sum: number; count: number }> }
      >()
      for (const mark of marks) {
        const classKey = mark.exam.classId
        if (!grouped.has(classKey)) {
          grouped.set(classKey, {
            className: mark.exam.class?.name || '',
            marks: [],
            pass: 0,
            fail: 0,
            subjectTotals: {},
          })
        }
        const g = grouped.get(classKey)!
        const score = Number(mark.marks || 0)
        g.marks.push(score)
        if (score >= 50) g.pass += 1
        else g.fail += 1
        if (!g.subjectTotals[mark.subject.name]) g.subjectTotals[mark.subject.name] = { sum: 0, count: 0 }
        g.subjectTotals[mark.subject.name].sum += score
        g.subjectTotals[mark.subject.name].count += 1
      }

      const classRows = Array.from(grouped.values()).map((g) => {
        const totalEntries = g.pass + g.fail
        const avg = g.marks.length ? g.marks.reduce((s, v) => s + v, 0) / g.marks.length : 0
        const passRate = totalEntries ? (g.pass / totalEntries) * 100 : 0
        const failureRate = totalEntries ? (g.fail / totalEntries) * 100 : 0
        const topSubjects = Object.entries(g.subjectTotals)
          .map(([subject, s]) => ({ subject, avg: s.count ? s.sum / s.count : 0 }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 3)
          .map((s) => `${s.subject} (${Math.round(s.avg)}%)`)
          .join(', ')
        return {
          className: g.className,
          averageScore: Math.round(avg * 100) / 100,
          passRate: Math.round(passRate * 100) / 100,
          failureRate: Math.round(failureRate * 100) / 100,
          subjectAnalysis: topSubjects || '-',
        }
      })

      classRows.sort((a, b) => Number(b.averageScore) - Number(a.averageScore))
      rows = classRows.map((r, idx) => ({
        rank: idx + 1,
        className: r.className,
        averageScore: r.averageScore,
        passRate: `${r.passRate}%`,
        failureRate: `${r.failureRate}%`,
        subjectAnalysis: r.subjectAnalysis,
        status:
          idx === 0
            ? 'Best Performing Class'
            : idx === classRows.length - 1
            ? 'Weakest Class'
            : 'Normal',
      }))

      headers = ['Rank', 'Class', 'Average Score', 'Pass Rate', 'Failure Rate', 'Subject Analysis', 'Status']
      keys = ['rank', 'className', 'averageScore', 'passRate', 'failureRate', 'subjectAnalysis', 'status']
      filename = `class-performance-${stamp}`
      title = 'Class Performance Report'
    }

    if (reportType === 'whole-school-performance') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          exam: { include: { class: true } },
        },
      })

      const grouped = new Map<string, { examName: string; examType: string; className: string; sum: number; count: number; pass: number }>()
      for (const mark of marks) {
        const key = `${mark.examId}::${mark.exam.classId}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            examName: mark.exam.name,
            examType: mark.exam.type,
            className: mark.exam.class?.name || '',
            sum: 0,
            count: 0,
            pass: 0,
          })
        }
        const entry = grouped.get(key)!
        const score = Number(mark.marks || 0)
        entry.sum += score
        entry.count += 1
        if (score >= 50) entry.pass += 1
      }

      rows = Array.from(grouped.values())
        .map((g) => {
          const avg = g.count ? g.sum / g.count : 0
          const passRate = g.count ? (g.pass / g.count) * 100 : 0
          return {
            examName: g.examName,
            examType: g.examType,
            className: g.className,
            averageScore: Math.round(avg * 100) / 100,
            passRate: `${Math.round(passRate * 100) / 100}%`,
            totalEntries: g.count,
          }
        })
        .sort((a, b) => Number(b.averageScore) - Number(a.averageScore))

      headers = ['Exam', 'Type', 'Class', 'Average Score', 'Pass Rate', 'Total Entries']
      keys = ['examName', 'examType', 'className', 'averageScore', 'passRate', 'totalEntries']
      filename = `whole-school-performance-${stamp}`
      title = 'Whole-School Exam Performance Report'
    }

    if (reportType === 'subject-performance') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          exam: true,
          subject: true,
        },
      })

      const grouped = new Map<string, { subjectName: string; examType: string; sum: number; count: number; pass: number }>()
      for (const mark of marks) {
        const key = `${mark.subjectId}::${mark.exam.type}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            subjectName: mark.subject.name,
            examType: mark.exam.type,
            sum: 0,
            count: 0,
            pass: 0,
          })
        }
        const entry = grouped.get(key)!
        const score = Number(mark.marks || 0)
        entry.sum += score
        entry.count += 1
        if (score >= 50) entry.pass += 1
      }

      rows = Array.from(grouped.values())
        .map((g) => {
          const averageScore = g.count ? g.sum / g.count : 0
          const passRate = g.count ? (g.pass / g.count) * 100 : 0
          return {
            subjectName: g.subjectName,
            examType: g.examType,
            averageScore: Math.round(averageScore * 100) / 100,
            passRate: `${Math.round(passRate * 100) / 100}%`,
            entries: g.count,
          }
        })
        .sort((a, b) => Number(b.averageScore) - Number(a.averageScore))

      headers = ['Subject', 'Exam Type', 'Average Score', 'Pass Rate', 'Entries']
      keys = ['subjectName', 'examType', 'averageScore', 'passRate', 'entries']
      filename = `subject-performance-${stamp}`
      title = 'Subject Performance Report'
    }

    if (reportType === 'student-rankings') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          student: { include: { class: true } },
        },
      })

      const studentAgg = new Map<string, { studentName: string; admissionNo: string; className: string; sum: number; count: number }>()
      for (const mark of marks) {
        if (!studentAgg.has(mark.studentId)) {
          studentAgg.set(mark.studentId, {
            studentName: `${mark.student.firstName} ${mark.student.lastName}`,
            admissionNo: mark.student.admissionNumber,
            className: mark.student.class?.name || '',
            sum: 0,
            count: 0,
          })
        }
        const entry = studentAgg.get(mark.studentId)!
        entry.sum += Number(mark.marks || 0)
        entry.count += 1
      }

      const rankingRows = Array.from(studentAgg.values())
        .map((s) => ({
          ...s,
          averageScore: s.count ? Math.round((s.sum / s.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => Number(b.averageScore) - Number(a.averageScore))

      rows = rankingRows.map((r, index) => ({
        rank: index + 1,
        studentName: r.studentName,
        admissionNo: r.admissionNo,
        className: r.className,
        averageScore: r.averageScore,
        subjectsRecorded: r.count,
      }))

      headers = ['Rank', 'Student', 'Admission No', 'Class', 'Average Score', 'Subjects Recorded']
      keys = ['rank', 'studentName', 'admissionNo', 'className', 'averageScore', 'subjectsRecorded']
      filename = `student-rankings-${stamp}`
      title = 'Student Ranking Summary Report'
    }

    if (reportType === 'national-internal-analysis') {
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        include: {
          exam: { include: { class: true } },
        },
      })

      const grouped = new Map<string, { examType: string; className: string; sum: number; count: number; pass: number }>()
      for (const mark of marks) {
        const typeRaw = (mark.exam.type || '').toUpperCase()
        const analysisType =
          typeRaw.includes('KCPE') || typeRaw.includes('KCSE')
            ? mark.exam.type
            : typeRaw.includes('INTERNAL')
            ? 'INTERNAL'
            : mark.exam.type || 'INTERNAL'

        const key = `${analysisType}::${mark.exam.classId}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            examType: analysisType,
            className: mark.exam.class?.name || '',
            sum: 0,
            count: 0,
            pass: 0,
          })
        }
        const entry = grouped.get(key)!
        const score = Number(mark.marks || 0)
        entry.sum += score
        entry.count += 1
        if (score >= 50) entry.pass += 1
      }

      rows = Array.from(grouped.values())
        .map((g) => {
          const averageScore = g.count ? g.sum / g.count : 0
          const passRate = g.count ? (g.pass / g.count) * 100 : 0
          return {
            examCategory: g.examType,
            className: g.className,
            averageScore: Math.round(averageScore * 100) / 100,
            passRate: `${Math.round(passRate * 100) / 100}%`,
            entries: g.count,
          }
        })
        .sort((a, b) => a.examCategory.localeCompare(b.examCategory) || a.className.localeCompare(b.className))

      headers = ['Exam Category', 'Class', 'Average Score', 'Pass Rate', 'Entries']
      keys = ['examCategory', 'className', 'averageScore', 'passRate', 'entries']
      filename = `kcpe-kcse-internal-analysis-${stamp}`
      title = 'KCPE / KCSE / Internal Exam Analysis Report'
    }

    if (reportType === 'teacher-performance') {
      const teachers = await db.user.findMany({
        where: { role: 'TEACHER', status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      })
      const classes = await db.schoolClass.findMany({
        where: { ...(classId && classId !== 'all' ? { id: classId } : {}) },
        select: { id: true, name: true, teacherId: true },
      })
      const marks = await db.examMark.findMany({
        where: {
          exam: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
        },
        select: { enteredBy: true, marks: true },
      })
      const attendance = await db.attendance.findMany({
        where: {
          termId: activeTerm.id,
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        select: { markedBy: true },
      })

      const marksByTeacher = marks.reduce<Record<string, { count: number; sum: number }>>((acc, m) => {
        if (!m.enteredBy) return acc
        if (!acc[m.enteredBy]) acc[m.enteredBy] = { count: 0, sum: 0 }
        acc[m.enteredBy].count += 1
        acc[m.enteredBy].sum += Number(m.marks || 0)
        return acc
      }, {})
      const attendanceByTeacher = attendance.reduce<Record<string, number>>((acc, a) => {
        if (!a.markedBy) return acc
        acc[a.markedBy] = (acc[a.markedBy] || 0) + 1
        return acc
      }, {})

      rows = teachers.map((teacher) => {
        const assignedClasses = classes.filter((c) => c.teacherId === teacher.id).map((c) => c.name)
        const m = marksByTeacher[teacher.id] || { count: 0, sum: 0 }
        const avg = m.count ? Math.round((m.sum / m.count) * 100) / 100 : 0
        const attendanceMarks = attendanceByTeacher[teacher.id] || 0
        return {
          teacherName: teacher.name,
          assignedClasses: assignedClasses.join(', ') || 'Unassigned',
          subjectsHandled: 'Derived from marks entered',
          lessonCompletion: 'N/A',
          attendanceTracking: attendanceMarks,
          performanceTracking: avg,
        }
      })

      headers = ['Teacher', 'Assigned Classes', 'Subjects Handled', 'Lesson Completion', 'Attendance Tracking', 'Performance Tracking']
      keys = ['teacherName', 'assignedClasses', 'subjectsHandled', 'lessonCompletion', 'attendanceTracking', 'performanceTracking']
      filename = `teacher-performance-${stamp}`
      title = 'Teacher Performance Report'
    }

    if (reportType === 'attendance-summary') {
      const attendances = await db.attendance.findMany({
        where: {
          termId: activeTerm.id,
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        include: {
          student: { include: { class: true } },
        },
      })

      const studentAgg = new Map<
        string,
        { studentName: string; admissionNo: string; className: string; present: number; absent: number; late: number; excused: number }
      >()
      for (const a of attendances) {
        if (!studentAgg.has(a.studentId)) {
          studentAgg.set(a.studentId, {
            studentName: `${a.student.firstName} ${a.student.lastName}`,
            admissionNo: a.student.admissionNumber,
            className: a.student.class?.name || '',
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          })
        }
        const s = studentAgg.get(a.studentId)!
        if (a.status === 'PRESENT') s.present += 1
        if (a.status === 'ABSENT') s.absent += 1
        if (a.status === 'LATE') s.late += 1
        if (a.status === 'EXCUSED') s.excused += 1
      }

      rows = Array.from(studentAgg.values()).map((s) => {
        const total = s.present + s.absent + s.late + s.excused
        const attendanceRate = total ? (((s.present + s.late + s.excused) / total) * 100) : 0
        const chronic = s.absent >= 5 || (total > 0 && (s.absent / total) * 100 >= 20)
        return {
          studentName: s.studentName,
          admissionNo: s.admissionNo,
          className: s.className,
          present: s.present,
          absent: s.absent,
          late: s.late,
          excused: s.excused,
          attendanceRate: `${Math.round(attendanceRate * 100) / 100}%`,
          chronicAbsenteeism: chronic ? 'Yes' : 'No',
        }
      })

      headers = ['Student', 'Admission No', 'Class', 'Present', 'Absent', 'Late', 'Excused', 'Attendance Rate', 'Chronic Absenteeism']
      keys = ['studentName', 'admissionNo', 'className', 'present', 'absent', 'late', 'excused', 'attendanceRate', 'chronicAbsenteeism']
      filename = `attendance-summary-${stamp}`
      title = 'Attendance Summary Report'
    }

    if (reportType === 'timetable') {
      const events = await db.calendarEvent.findMany({
        where: {
          startDate: { gte: activeTerm.startDate, lte: activeTerm.endDate },
        },
        orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
      })

      rows = events.map((e) => ({
        title: e.title,
        eventType: e.eventType,
        date: fmtDate(new Date(e.startDate)),
        startTime: e.startTime || (e.isAllDay ? 'All Day' : '-'),
        endTime: e.endTime || '-',
        location: e.location || '-',
        target: e.targetRoles || 'ALL',
      }))

      headers = ['Title', 'Type', 'Date', 'Start Time', 'End Time', 'Location', 'Target']
      keys = ['title', 'eventType', 'date', 'startTime', 'endTime', 'location', 'target']
      filename = `timetable-${stamp}`
      title = 'Timetable Export'
    }

    if (reportType === 'follow-up') {
      const students = await db.student.findMany({
        where: {
          status: 'ACTIVE',
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        include: { class: true },
      })
      const studentIds = students.map((s) => s.id)
      const [marks, attendances] = await Promise.all([
        db.examMark.findMany({
          where: { exam: { termId: activeTerm.id, ...(classId && classId !== 'all' ? { classId } : {}) } },
          select: { studentId: true, marks: true },
        }),
        db.attendance.findMany({
          where: { termId: activeTerm.id, studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        }),
      ])

      const marksAgg = marks.reduce<Record<string, { sum: number; count: number }>>((acc, m) => {
        if (!acc[m.studentId]) acc[m.studentId] = { sum: 0, count: 0 }
        acc[m.studentId].sum += Number(m.marks || 0)
        acc[m.studentId].count += 1
        return acc
      }, {})
      const attendanceAgg = attendances.reduce<Record<string, { absent: number; total: number }>>((acc, a) => {
        if (!acc[a.studentId]) acc[a.studentId] = { absent: 0, total: 0 }
        acc[a.studentId].total += 1
        if (a.status === 'ABSENT') acc[a.studentId].absent += 1
        return acc
      }, {})

      rows = students
        .map((s) => {
          const perf = marksAgg[s.id] || { sum: 0, count: 0 }
          const avg = perf.count ? perf.sum / perf.count : 0
          const att = attendanceAgg[s.id] || { absent: 0, total: 0 }
          const absentRate = att.total ? (att.absent / att.total) * 100 : 0
          const poorPerformance = perf.count > 0 && avg < 50
          const frequentAbsenteeism = att.total > 0 && (att.absent >= 5 || absentRate >= 20)

          const reasons: string[] = []
          if (poorPerformance) reasons.push('Poor performance')
          if (frequentAbsenteeism) reasons.push('Frequent absenteeism')

          return {
            studentName: `${s.firstName} ${s.lastName}`,
            admissionNo: s.admissionNumber,
            className: s.class?.name || '',
            averageMarks: Math.round(avg * 100) / 100,
            absentDays: att.absent,
            absentRate: `${Math.round(absentRate * 100) / 100}%`,
            disciplineIssues: 'Not captured',
            followUpReason: reasons.join('; ') || '',
          }
        })
        .filter((r) => r.followUpReason.length > 0)

      headers = ['Student', 'Admission No', 'Class', 'Average Marks', 'Absent Days', 'Absent Rate', 'Discipline Issues', 'Follow-up Reason']
      keys = ['studentName', 'admissionNo', 'className', 'averageMarks', 'absentDays', 'absentRate', 'disciplineIssues', 'followUpReason']
      filename = `academic-follow-up-${stamp}`
      title = 'Discipline & Academic Follow-up Report'
    }

    if (reportType === 'staff-attendance') {
      const staff = await db.user.findMany({
        where: {
          role: { in: ['TEACHER', 'DOS', 'HEADTEACHER', 'SECRETARY', 'BURSAR', 'ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      })
      const [attendanceMarks, marksEntered] = await Promise.all([
        db.attendance.findMany({
          where: {
            termId: activeTerm.id,
            ...(classId && classId !== 'all' ? { classId } : {}),
          },
          select: { markedBy: true, date: true },
        }),
        db.examMark.findMany({
          where: {
            exam: {
              termId: activeTerm.id,
              ...(classId && classId !== 'all' ? { classId } : {}),
            },
          },
          select: { enteredBy: true, createdAt: true },
        }),
      ])

      const attendanceDaysByUser = attendanceMarks.reduce<Record<string, Set<string>>>((acc, a) => {
        if (!a.markedBy) return acc
        if (!acc[a.markedBy]) acc[a.markedBy] = new Set<string>()
        acc[a.markedBy].add(new Date(a.date).toISOString().slice(0, 10))
        return acc
      }, {})
      const marksDaysByUser = marksEntered.reduce<Record<string, Set<string>>>((acc, m) => {
        if (!m.enteredBy) return acc
        if (!acc[m.enteredBy]) acc[m.enteredBy] = new Set<string>()
        acc[m.enteredBy].add(new Date(m.createdAt).toISOString().slice(0, 10))
        return acc
      }, {})

      rows = staff.map((s) => {
        const attendanceDays = attendanceDaysByUser[s.id]?.size || 0
        const marksDays = marksDaysByUser[s.id]?.size || 0
        const recordedDays = attendanceDays + marksDays
        return {
          staffName: s.name,
          role: s.role,
          attendanceRecordedDays: attendanceDays,
          marksEntryDays: marksDays,
          totalActiveDays: recordedDays,
          status: recordedDays > 0 ? 'Active in system records' : 'No tracked academic activity',
        }
      })

      headers = ['Staff Name', 'Role', 'Attendance Recorded Days', 'Marks Entry Days', 'Total Active Days', 'Status']
      keys = ['staffName', 'role', 'attendanceRecordedDays', 'marksEntryDays', 'totalActiveDays', 'status']
      filename = `staff-attendance-${stamp}`
      title = 'Staff Attendance Report'
    }

    if (reportType === 'staff-management') {
      const staff = await db.user.findMany({
        where: {
          role: { in: ['TEACHER', 'DOS', 'HEADTEACHER', 'SECRETARY', 'BURSAR'] },
          status: 'ACTIVE',
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      })
      const classes = await db.schoolClass.findMany({
        where: { ...(classId && classId !== 'all' ? { id: classId } : {}) },
        select: { id: true, name: true, teacherId: true },
      })
      const [markEntries, attendanceMarks] = await Promise.all([
        db.examMark.findMany({
          where: { exam: { termId: activeTerm.id, ...(classId && classId !== 'all' ? { classId } : {}) } },
          select: { enteredBy: true },
        }),
        db.attendance.findMany({
          where: { termId: activeTerm.id, ...(classId && classId !== 'all' ? { classId } : {}) },
          select: { markedBy: true },
        }),
      ])

      const marksByUser = markEntries.reduce<Record<string, number>>((acc, m) => {
        if (!m.enteredBy) return acc
        acc[m.enteredBy] = (acc[m.enteredBy] || 0) + 1
        return acc
      }, {})
      const attendanceByUser = attendanceMarks.reduce<Record<string, number>>((acc, a) => {
        if (!a.markedBy) return acc
        acc[a.markedBy] = (acc[a.markedBy] || 0) + 1
        return acc
      }, {})

      rows = staff.map((s) => ({
        staffName: s.name,
        role: s.role,
        assignedClasses: classes.filter((c) => c.teacherId === s.id).map((c) => c.name).join(', ') || 'N/A',
        staffPerformance: (marksByUser[s.id] || 0) + (attendanceByUser[s.id] || 0),
        leaveReports: 'Not captured',
        dutyAllocations: 'Not captured',
      }))

      headers = ['Staff Name', 'Role', 'Assigned Classes', 'Staff Performance Summary', 'Staff Leave Reports', 'Staff Duty Allocations']
      keys = ['staffName', 'role', 'assignedClasses', 'staffPerformance', 'leaveReports', 'dutyAllocations']
      filename = `staff-management-${stamp}`
      title = 'Staff Management Report'
    }

    if (reportType === 'admissions-enrollment') {
      const students = await db.student.findMany({
        where: {
          ...(classId && classId !== 'all' ? { classId } : {}),
        },
        include: { class: true },
      })

      const newAdmissions = students.filter((s) => {
        const dt = new Date(s.admissionDate)
        return dt >= activeTerm.startDate && dt <= activeTerm.endDate
      }).length
      const transferred = students.filter((s) => s.status === 'TRANSFERRED').length

      const byClass = students.reduce<Record<string, { total: number; male: number; female: number; day: number; boarding: number }>>((acc, s) => {
        const key = s.class?.name || 'Unassigned'
        if (!acc[key]) acc[key] = { total: 0, male: 0, female: 0, day: 0, boarding: 0 }
        acc[key].total += 1
        if ((s.gender || '').toUpperCase() === 'MALE') acc[key].male += 1
        if ((s.gender || '').toUpperCase() === 'FEMALE') acc[key].female += 1
        if ((s.studentType || '').toUpperCase() === 'BOARDING') acc[key].boarding += 1
        else acc[key].day += 1
        return acc
      }, {})

      rows = Object.entries(byClass).map(([className, v]) => ({
        className,
        enrollment: v.total,
        male: v.male,
        female: v.female,
        genderBalance: `${v.male}:${v.female}`,
        dayStudents: v.day,
        boardingStudents: v.boarding,
        newAdmissions,
        transfers: transferred,
      }))

      headers = ['Class', 'Enrollment', 'Male', 'Female', 'Gender Balance', 'Day Students', 'Boarding Students', 'New Admissions (Current Term)', 'Transfers']
      keys = ['className', 'enrollment', 'male', 'female', 'genderBalance', 'dayStudents', 'boardingStudents', 'newAdmissions', 'transfers']
      filename = `admissions-enrollment-${stamp}`
      title = 'Admission & Enrollment Report'
    }

    if (reportType === 'discipline-welfare') {
      const students = await db.student.findMany({
        where: { status: 'ACTIVE', ...(classId && classId !== 'all' ? { classId } : {}) },
        include: { class: true },
      })
      const studentIds = students.map((s) => s.id)
      const [attendances, healthRecords] = await Promise.all([
        db.attendance.findMany({
          where: { termId: activeTerm.id, studentId: { in: studentIds } },
          select: { studentId: true, status: true },
        }),
        db.healthRecord.findMany({
          where: { studentId: { in: studentIds }, status: { in: ['ACTIVE', 'ONGOING', 'MONITORING'] } },
          select: { studentId: true },
        }),
      ])

      const absentAgg = attendances.reduce<Record<string, { absent: number; total: number }>>((acc, a) => {
        if (!acc[a.studentId]) acc[a.studentId] = { absent: 0, total: 0 }
        acc[a.studentId].total += 1
        if (a.status === 'ABSENT') acc[a.studentId].absent += 1
        return acc
      }, {})
      const healthAgg = healthRecords.reduce<Record<string, number>>((acc, h) => {
        acc[h.studentId] = (acc[h.studentId] || 0) + 1
        return acc
      }, {})

      rows = students
        .map((s) => {
          const a = absentAgg[s.id] || { absent: 0, total: 0 }
          const absentRate = a.total ? (a.absent / a.total) * 100 : 0
          const needsDisciplineFollowUp = a.absent >= 5 || absentRate >= 20
          const welfareCases = healthAgg[s.id] || 0
          return {
            studentName: `${s.firstName} ${s.lastName}`,
            admissionNo: s.admissionNumber,
            className: s.class?.name || '',
            disciplineReport: needsDisciplineFollowUp ? 'Attendance concern' : 'None flagged',
            suspensionRecords: 'Not captured',
            counselingFollowUp: needsDisciplineFollowUp ? 'Recommended' : 'Optional',
            welfareCasesSummary: welfareCases > 0 ? `${welfareCases} active welfare/health case(s)` : 'None',
          }
        })
        .filter((r) => r.disciplineReport !== 'None flagged' || r.welfareCasesSummary !== 'None')

      headers = ['Student', 'Admission No', 'Class', 'Discipline Report', 'Suspension Records', 'Counseling Follow-up', 'Welfare Cases Summary']
      keys = ['studentName', 'admissionNo', 'className', 'disciplineReport', 'suspensionRecords', 'counselingFollowUp', 'welfareCasesSummary']
      filename = `discipline-welfare-${stamp}`
      title = 'Discipline & Welfare Report'
    }

    await logExport({
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: 'ACADEMIC',
      reportType,
      format: format === 'excel' ? 'xls' : format,
      userId: authed.id,
      userName: authed.name,
      role: authed.role,
      filters: {
        classId: classId || null,
      },
      rowCount: rows.length,
      createdAt: new Date().toISOString(),
    })

    if (format === 'xls' || format === 'excel') {
      const html = toXlsHtml(headers, rows, keys)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.xls"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdf = await toPdf(title, headers, rows, keys, stamp)
      return new NextResponse(pdf.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          ...(pdf.truncated ? { 'X-Export-Truncated': 'true' } : {}),
        },
      })
    }

    const csv = toCsv(headers, rows, keys)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to export academic report')
  }
}
