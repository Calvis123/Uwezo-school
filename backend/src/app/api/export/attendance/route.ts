import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { canTeacherAccessClass } from '@/lib/teacher-access'
import { buildStyledExportPdf } from '@/lib/export-pdf'

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const format = (searchParams.get('format') || 'csv').toLowerCase()

    if (!classId || classId === 'all') {
      return NextResponse.json(
        { success: false, error: 'classId is required for attendance export' },
        { status: 400 }
      )
    }

    const canAccess = await canTeacherAccessClass(authed, classId)
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: class is not assigned to this teacher' },
        { status: 403 }
      )
    }

    const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear()

    const startDate = new Date(yearNum, monthNum - 1, 1)
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

    const students = await db.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const attendances = await db.attendance.findMany({
      where: {
        classId,
        date: { gte: startDate, lte: endDate },
      },
    })

    const monthName = startDate.toLocaleDateString('en-US', { month: 'long' })

    const rows = students.map((s) => {
      const studentAttendances = attendances.filter((a) => a.studentId === s.id)
      const presentDays = studentAttendances.filter((a) => a.status === 'PRESENT').length
      const absentDays = studentAttendances.filter((a) => a.status === 'ABSENT').length
      const lateDays = studentAttendances.filter((a) => a.status === 'LATE').length
      const totalRecorded = presentDays + absentDays + lateDays
      const rate = totalRecorded > 0 ? Math.round(((presentDays + lateDays) / totalRecorded) * 1000) / 10 : 0
      return {
        name: `${s.firstName} ${s.lastName}`,
        admissionNumber: s.admissionNumber,
        presentDays,
        absentDays,
        lateDays,
        rate,
      }
    })

    const stamp = `${monthName}-${yearNum}-${new Date().toISOString().slice(0, 10)}`

    if (format === 'xls' || format === 'excel') {
      const escapeHtml = (v: string) =>
        (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
        <table border="1">
          <thead><tr>
            <th>Student Name</th><th>Admission No</th><th>Present</th><th>Absent</th><th>Late</th><th>Attendance Rate</th>
          </tr></thead>
          <tbody>
            ${rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.admissionNumber)}</td><td>${r.presentDays}</td><td>${r.absentDays}</td><td>${r.lateDays}</td><td>${r.rate}%</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </body></html>`
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="attendance-${stamp}-export.xls"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdfRows = rows.map((r) => ({
        ...r,
        attendanceRate: `${r.rate}%`,
      }))
      const headers = ['Student Name', 'Admission No', 'Present Days', 'Absent Days', 'Late Days', 'Attendance Rate']
      const keys = ['name', 'admissionNumber', 'presentDays', 'absentDays', 'lateDays', 'attendanceRate']
      const pdf = await buildStyledExportPdf({
        title: 'Attendance Export',
        headers,
        rows: pdfRows,
        keys,
        stamp: `${monthName} ${yearNum}`,
        maxRows: 500,
      })

      return new NextResponse(pdf.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="attendance-${stamp}-export.pdf"`,
          ...(pdf.truncated ? { 'X-Export-Truncated': 'true' } : {}),
        },
      })
    }

    const csvLines = [
      `Student Name,Admission No,Present Days,Absent Days,Late Days,Attendance Rate`,
      ...rows.map((r) => {
        const escaped = (val: string) => `"${(val || '').replace(/"/g, '""')}"`
        return [
          escaped(r.name),
          escaped(r.admissionNumber),
          String(r.presentDays),
          String(r.absentDays),
          String(r.lateDays),
          `${r.rate}%`,
        ].join(',')
      }),
    ]

    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance-${monthName}-${yearNum}-export.csv"`,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
