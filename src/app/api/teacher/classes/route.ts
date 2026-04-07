import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'teacherId is required' }, { status: 400 })
    }

    // Get classes assigned to this teacher with student counts
    const classes = await db.schoolClass.findMany({
      where: { teacherId, status: 'ACTIVE' },
      include: {
        _count: {
          select: { students: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    // Get active term for attendance rate
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
    })

    // Get attendance rates per class for the current term
    const classIds = classes.map((c) => c.id)
    const attendanceRates: Record<string, number> = {}

    if (activeTerm && classIds.length > 0) {
      const termAttendance = await db.attendance.findMany({
        where: {
          classId: { in: classIds },
          termId: activeTerm.id,
        },
        select: {
          classId: true,
          status: true,
        },
      })

      const counts: Record<string, { total: number; present: number }> = {}
      for (const att of termAttendance) {
        if (!counts[att.classId]) counts[att.classId] = { total: 0, present: 0 }
        counts[att.classId].total++
        if (att.status === 'PRESENT' || att.status === 'LATE') counts[att.classId].present++
      }

      for (const cls of classes) {
        const c = counts[cls.id]
        attendanceRates[cls.id] = c && c.total > 0
          ? Math.round((c.present / c.total) * 100 * 10) / 10
          : 0
      }
    }

    // Get average exam scores per class
    const examMarks = await db.examMark.findMany({
      where: {
        exam: { classId: { in: classIds } },
      },
      include: {
        exam: { select: { classId: true } },
      },
    })

    const scoresByClass: Record<string, { total: number; count: number }> = {}
    for (const mark of examMarks) {
      const classId = mark.exam.classId
      if (!scoresByClass[classId]) scoresByClass[classId] = { total: 0, count: 0 }
      scoresByClass[classId].total += mark.marks
      scoresByClass[classId].count++
    }

    const result = classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      level: cls.level,
      stream: cls.stream,
      capacity: cls.capacity,
      studentCount: cls._count.students,
      attendanceRate: attendanceRates[cls.id] || 0,
      averageScore: scoresByClass[cls.id] && scoresByClass[cls.id].count > 0
        ? Math.round((scoresByClass[cls.id].total / scoresByClass[cls.id].count) * 10) / 10
        : 0,
    }))

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Teacher classes error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load teacher classes' }, { status: 500 })
  }
}
