import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'teacherId is required' }, { status: 400 })
    }

    // Get teacher info
    const teacher = await db.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!teacher) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 })
    }

    // Get classes assigned to this teacher
    const teacherClasses = await db.schoolClass.findMany({
      where: { teacherId },
      include: {
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    const classIds = teacherClasses.map((c) => c.id)

    // Get total students across all my classes
    const totalStudents = teacherClasses.reduce((sum, c) => sum + c._count.students, 0)

    // Get active term
    const activeTerm = await db.term.findFirst({
      where: { status: 'ACTIVE' },
    })

    // Today's attendance overview for my classes
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await db.attendance.findMany({
      where: {
        classId: { in: classIds },
        date: { gte: today, lt: tomorrow },
      },
    })

    // Group attendance by class
    const attendanceByClass: Record<string, { total: number; present: number; absent: number; late: number }> = {}
    for (const cls of teacherClasses) {
      attendanceByClass[cls.id] = { total: 0, present: 0, absent: 0, late: 0 }
    }
    for (const att of todayAttendance) {
      if (attendanceByClass[att.classId]) {
        attendanceByClass[att.classId].total++
        if (att.status === 'PRESENT') attendanceByClass[att.classId].present++
        else if (att.status === 'ABSENT') attendanceByClass[att.classId].absent++
        else if (att.status === 'LATE') attendanceByClass[att.classId].late++
      }
    }

    // Classes with attendance marked today
    const classesWithAttendanceToday = teacherClasses
      .filter((c) => attendanceByClass[c.id]?.total > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        stream: c.stream,
        studentCount: c._count.students,
        attendance: attendanceByClass[c.id],
      }))

    // Classes pending attendance
    const pendingAttendance = teacherClasses
      .filter((c) => attendanceByClass[c.id]?.total === 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        stream: c.stream,
        studentCount: c._count.students,
      }))

    // Upcoming exams for my classes
    const upcomingExams = await db.exam.findMany({
      where: {
        classId: { in: classIds },
        startDate: { gte: today },
      },
      include: {
        class: { select: { name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 10,
    })

    // Calculate average score per class from exam marks
    const examMarksForClasses = await db.examMark.findMany({
      where: {
        exam: {
          classId: { in: classIds },
        },
      },
      include: {
        exam: {
          select: { classId: true },
        },
      },
    })

    const scoresByClass: Record<string, { total: number; count: number }> = {}
    for (const mark of examMarksForClasses) {
      const classId = mark.exam.classId
      if (!scoresByClass[classId]) scoresByClass[classId] = { total: 0, count: 0 }
      scoresByClass[classId].total += mark.marks
      scoresByClass[classId].count++
    }

    // Calculate overall average performance
    let avgPerformance = 0
    if (examMarksForClasses.length > 0) {
      const totalMarks = examMarksForClasses.reduce((sum, m) => sum + m.marks, 0)
      avgPerformance = Math.round((totalMarks / examMarksForClasses.length) * 10) / 10
    }

    // Count exams with no marks entered (pending grades)
    const pendingGrades = await db.exam.count({
      where: {
        classId: { in: classIds },
        startDate: { lte: new Date() },
        status: { in: ['DRAFT', 'ACTIVE'] },
      },
    })

    // Unread messages for teacher
    const unreadMessages = await db.message.count({
      where: { receiverId: teacherId, isRead: false },
    })

    // Recent messages received
    const recentMessages = await db.message.findMany({
      where: { receiverId: teacherId },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Recent activity
    const recentAttendance = await db.attendance.findMany({
      where: {
        classId: { in: classIds },
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        class: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const recentExamMarks = await db.examMark.findMany({
      where: {
        exam: { classId: { in: classIds } },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        exam: { select: { name: true, class: { select: { name: true } } } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Combine recent activities
    const recentActivities = [
      ...recentAttendance.map((a) => ({
        id: a.id,
        type: 'attendance' as const,
        description: `${a.student.firstName} ${a.student.lastName} (${a.student.admissionNumber}) — ${a.status}`,
        className: a.class.name,
        timestamp: a.createdAt,
      })),
      ...recentExamMarks.map((m) => ({
        id: m.id,
        type: 'exam' as const,
        description: `${m.student.firstName} ${m.student.lastName} — ${m.subject.name}: ${m.marks}/${m.exam.totalMarks} (${m.grade || 'N/A'})`,
        className: m.exam.class.name,
        timestamp: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

    // Attendance rate per class (for current term)
    let attendanceRatesByClass: Record<string, number> = {}
    if (activeTerm) {
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

      const termCounts: Record<string, { total: number; present: number }> = {}
      for (const att of termAttendance) {
        if (!termCounts[att.classId]) termCounts[att.classId] = { total: 0, present: 0 }
        termCounts[att.classId].total++
        if (att.status === 'PRESENT' || att.status === 'LATE') termCounts[att.classId].present++
      }

      for (const cls of teacherClasses) {
        const counts = termCounts[cls.id]
        attendanceRatesByClass[cls.id] = counts && counts.total > 0
          ? Math.round((counts.present / counts.total) * 100 * 10) / 10
          : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
        },
        classes: teacherClasses.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          stream: c.stream,
          capacity: c.capacity,
          studentCount: c._count.students,
          averageScore: scoresByClass[c.id] && scoresByClass[c.id].count > 0
            ? Math.round((scoresByClass[c.id].total / scoresByClass[c.id].count) * 10) / 10
            : undefined,
          attendanceRate: attendanceRatesByClass[c.id] || 0,
        })),
        totalStudents,
        pendingAttendanceCount: pendingAttendance.length,
        upcomingExams: upcomingExams.map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate,
          className: e.class.name,
        })),
        averagePerformance: avgPerformance,
        pendingGrades,
        unreadMessages,
        recentMessages: recentMessages.map((m) => ({
          id: m.id,
          subject: m.subject,
          content: m.content.substring(0, 120),
          senderName: m.sender.name,
          senderRole: m.sender.role,
          isRead: m.isRead,
          createdAt: m.createdAt,
        })),
        attendanceToday: {
          marked: classesWithAttendanceToday,
          pending: pendingAttendance,
          summary: {
            totalClasses: teacherClasses.length,
            classesMarked: classesWithAttendanceToday.length,
            classesPending: pendingAttendance.length,
          },
        },
        recentActivities,
        activeTerm: activeTerm ? {
          id: activeTerm.id,
          name: activeTerm.name,
          year: activeTerm.year,
          status: activeTerm.status,
        } : null,
      },
    })
  } catch (error: any) {
    console.error('Teacher dashboard error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load teacher dashboard' }, { status: 500 })
  }
}
