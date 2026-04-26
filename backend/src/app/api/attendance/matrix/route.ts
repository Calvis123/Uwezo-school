import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { canTeacherAccessClass } from '@/lib/teacher-access'
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance'

function monthDates(year: number, month: number) {
  const dates: Date[] = []
  const totalDays = new Date(year, month, 0).getDate()
  for (let day = 1; day <= totalDays; day++) {
    dates.push(new Date(year, month - 1, day))
  }
  return dates
}

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] })
    const { searchParams } = new URL(request.url)

    const classId = searchParams.get('classId')
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

    if (!classId) {
      return NextResponse.json(
        { success: false, error: 'classId is required' },
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

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)
    const dates = monthDates(year, month)

    const [students, attendance] = await Promise.all([
      db.student.findMany({
        where: { classId, status: 'ACTIVE' },
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      db.attendance.findMany({
        where: {
          classId,
          status: { in: [...MARKED_ATTENDANCE_STATUSES] },
          date: { gte: startDate, lte: endDate },
        },
        select: {
          studentId: true,
          date: true,
          status: true,
        },
      }),
    ])

    const matrix: Record<string, Record<string, string>> = {}
    for (const student of students) matrix[student.id] = {}

    for (const record of attendance) {
      const key = record.date.toISOString().slice(0, 10)
      matrix[record.studentId][key] = record.status
    }

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        dates: dates.map((date) => ({
          value: date.toISOString().slice(0, 10),
          day: date.getDate(),
          short: date.toLocaleDateString('en-US', { weekday: 'short' }),
        })),
        students: students.map((student) => ({
          id: student.id,
          admissionNumber: student.admissionNumber,
          name: `${student.firstName} ${student.lastName}`,
        })),
        matrix,
      },
    })
  } catch (error: unknown) {
    console.error('Error loading attendance matrix:', error)
    return apiRouteError(error, 'Failed to load attendance matrix')
  }
}
