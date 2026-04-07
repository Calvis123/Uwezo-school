import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))

    const activities: any[] = []

    // 1. Recent payments
    if (!type || type === 'PAYMENT') {
      const payments = await db.feeTransaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
        },
      })

      for (const p of payments) {
        activities.push({
          id: `payment-${p.id}`,
          type: 'PAYMENT',
          title: `Payment received`,
          description: `${p.student ? p.student.firstName + ' ' + p.student.lastName : 'Unknown student'} paid KES ${p.amount.toLocaleString()} via ${p.paymentMethod}`,
          user: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
          timestamp: p.createdAt.toISOString(),
          icon: 'payment',
          color: 'green',
          initials: p.student ? getInitials(p.student.firstName + ' ' + p.student.lastName) : '??',
          receiptNumber: p.receiptNumber,
          amount: p.amount,
          method: p.paymentMethod,
        })
      }
    }

    // 2. Recent attendance marks
    if (!type || type === 'ATTENDANCE') {
      const attendanceRecords = await db.attendance.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          class: true,
        },
      })

      for (const a of attendanceRecords) {
        const statusEmoji = a.status === 'PRESENT' ? '✓' : a.status === 'ABSENT' ? '✗' : a.status === 'LATE' ? '◷' : '~'
        activities.push({
          id: `attendance-${a.id}`,
          type: 'ATTENDANCE',
          title: `Attendance marked: ${a.status}`,
          description: `${a.student ? a.student.firstName + ' ' + a.student.lastName : 'Unknown'} marked ${a.status.toLowerCase()} in ${a.class?.name || 'Unknown class'}`,
          user: a.student ? `${a.student.firstName} ${a.student.lastName}` : 'Unknown',
          timestamp: a.createdAt.toISOString(),
          icon: 'attendance',
          color: 'teal',
          initials: a.student ? getInitials(a.student.firstName + ' ' + a.student.lastName) : '??',
          status: a.status,
        })
      }
    }

    // 3. Recent exam marks
    if (!type || type === 'EXAM') {
      const examMarks = await db.examMark.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          exam: true,
          subject: true,
        },
      })

      for (const m of examMarks) {
        activities.push({
          id: `exam-${m.id}`,
          type: 'EXAM',
          title: `Marks entered`,
          description: `${m.student ? m.student.firstName + ' ' + m.student.lastName : 'Unknown'} scored ${m.marks}/100 in ${m.subject?.name || 'Unknown'} (${m.exam?.name || 'Exam'})`,
          user: m.student ? `${m.student.firstName} ${m.student.lastName}` : 'Unknown',
          timestamp: m.createdAt.toISOString(),
          icon: 'exam',
          color: 'amber',
          initials: m.student ? getInitials(m.student.firstName + ' ' + m.student.lastName) : '??',
          marks: m.marks,
          subject: m.subject?.name,
          exam: m.exam?.name,
        })
      }
    }

    // 4. Recent notice publications
    if (!type || type === 'NOTICE') {
      const notices = await db.schoolNotice.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { isPublished: true },
      })

      for (const n of notices) {
        activities.push({
          id: `notice-${n.id}`,
          type: 'NOTICE',
          title: n.title,
          description: n.content.length > 120 ? n.content.substring(0, 120) + '...' : n.content,
          user: 'School Administration',
          timestamp: (n.publishedAt || n.createdAt).toISOString(),
          icon: 'notice',
          color: 'sky',
          initials: 'SA',
          category: n.category,
        })
      }
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Add relative time to each
    const enrichedActivities = activities.map((a) => ({
      ...a,
      relativeTime: timeAgo(new Date(a.timestamp)),
    }))

    // Pagination
    const total = enrichedActivities.length
    const start = (page - 1) * limit
    const paginated = enrichedActivities.slice(start, start + limit)

    // Count by type
    const typeCounts: Record<string, number> = {}
    for (const a of activities) {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      data: {
        items: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        typeCounts,
      },
    })
  } catch (error: any) {
    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}
