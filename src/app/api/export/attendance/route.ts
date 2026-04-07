import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!classId || classId === 'all') {
      return NextResponse.json(
        { success: false, error: 'classId is required for attendance export' },
        { status: 400 }
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

    const csvLines = [
      `Student Name,Admission No,Present Days,Absent Days,Late Days,Attendance Rate`,
      ...students.map((s) => {
        const studentAttendances = attendances.filter(
          (a) => a.studentId === s.id
        )

        const presentDays = studentAttendances.filter(
          (a) => a.status === 'PRESENT'
        ).length
        const absentDays = studentAttendances.filter(
          (a) => a.status === 'ABSENT'
        ).length
        const lateDays = studentAttendances.filter(
          (a) => a.status === 'LATE'
        ).length

        const totalRecorded = presentDays + absentDays + lateDays
        const rate =
          totalRecorded > 0
            ? ((presentDays + lateDays) / totalRecorded * 100).toFixed(1)
            : '0.0'

        const name = `${s.firstName} ${s.lastName}`
        const escaped = (val: string) => `"${val.replace(/"/g, '""')}"`
        return [
          escaped(name),
          escaped(s.admissionNumber),
          presentDays.toString(),
          absentDays.toString(),
          lateDays.toString(),
          `${rate}%`,
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
