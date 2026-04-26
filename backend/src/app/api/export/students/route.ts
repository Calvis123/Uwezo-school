import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { getTeacherAssignedClassIds } from '@/lib/teacher-access'
import { buildStyledExportPdf } from '@/lib/export-pdf'

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const status = searchParams.get('status')
    const format = (searchParams.get('format') || 'csv').toLowerCase()

    const where: any = {}
    const teacherClassIds = await getTeacherAssignedClassIds(authed)
    if (teacherClassIds) {
      if (classId && classId !== 'all' && !teacherClassIds.includes(classId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: class is not assigned to this teacher' },
          { status: 403 }
        )
      }
      where.classId = classId && classId !== 'all' ? classId : { in: teacherClassIds }
    } else if (classId && classId !== 'all') {
      where.classId = classId
    }
    if (status && status !== 'all') where.status = status
    const isSingleClassExport = Boolean(classId && classId !== 'all')

    const selectedClass = isSingleClassExport
      ? await db.schoolClass.findUnique({
          where: { id: classId as string },
          select: { name: true },
        })
      : null

    const students = await db.student.findMany({
      where,
      include: {
        class: true,
        guardians: {
          include: { guardian: true },
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const rows = students.map((s) => ({
      admissionNumber: s.admissionNumber,
      name: `${s.firstName} ${s.lastName}`,
      className: s.class?.name || '',
      gender: s.gender || '',
      status: s.status,
      parentContact: s.guardians[0]?.guardian?.phone || '',
    }))

    const date = new Date().toISOString().slice(0, 10)
    const reportTitle = isSingleClassExport && selectedClass?.name
      ? `Students Export - ${selectedClass.name}`
      : 'Students Export'
    const fileBaseName = isSingleClassExport && selectedClass?.name
      ? `students-export-${selectedClass.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
      : 'students-export'

    const headers = isSingleClassExport
      ? ['Admission No', 'Name', 'Gender', 'Status', 'Parent Contact']
      : ['Admission No', 'Name', 'Class', 'Gender', 'Status', 'Parent Contact']
    const keys = isSingleClassExport
      ? ['admissionNumber', 'name', 'gender', 'status', 'parentContact']
      : ['admissionNumber', 'name', 'className', 'gender', 'status', 'parentContact']

    if (format === 'xls' || format === 'excel') {
      const escapeHtml = (v: string) =>
        (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>
        <table border="1">
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows
              .map((r) => `<tr>${keys.map((k) => `<td>${escapeHtml((r as any)[k] || '')}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>
      </body></html>`
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileBaseName}.xls"`,
        },
      })
    }

    if (format === 'pdf') {
      const pdf = await buildStyledExportPdf({
        title: reportTitle,
        headers,
        rows,
        keys,
        stamp: date,
        maxRows: 500,
        showDate: false,
      })

      return new NextResponse(pdf.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileBaseName}.pdf"`,
          ...(pdf.truncated ? { 'X-Export-Truncated': 'true' } : {}),
        },
      })
    }

    // Default: CSV
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => {
        const escaped = (val: string) => `"${(val || '').replace(/"/g, '""')}"`
        return keys.map((k) => escaped((r as any)[k] || '')).join(',')
      }),
    ]

    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileBaseName}.csv"`,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
