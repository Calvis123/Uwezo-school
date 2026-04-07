import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface NotificationItem {
  id: string;
  type: 'PAYMENT' | 'ATTENDANCE' | 'EXAM' | 'MESSAGE' | 'NOTICE' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  link: string;
  actorName?: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const userMatch = cookie.match(/user=([^;]+)/);
    const user = userMatch ? JSON.parse(decodeURIComponent(userMatch[1])) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const notifications: NotificationItem[] = [];

    // Run all queries in parallel
    const [
      recentPayments,
      recentAttendance,
      recentExamMarks,
      recentMessages,
      recentNotices,
      recentAbsences,
    ] = await Promise.all([
      // Recent fee payments (last 7 days)
      db.feeTransaction.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          feeStructure: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent attendance records (last 3 days)
      db.attendance.findMany({
        where: {
          createdAt: { gte: threeDaysAgo },
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, classId: true } },
          class: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),

      // Recent exam marks entered (last 7 days)
      db.examMark.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        include: {
          exam: { select: { id: true, name: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Recent messages for the user (last 7 days)
      db.message.findMany({
        where: {
          OR: [
            { receiverId: user.id, createdAt: { gte: sevenDaysAgo } },
            { senderId: user.id, createdAt: { gte: sevenDaysAgo } },
          ],
        },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent published notices (last 7 days)
      db.schoolNotice.findMany({
        where: {
          isPublished: true,
          publishedAt: { gte: sevenDaysAgo },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),

      // Recent absences (for staff/admin users)
      user.role !== 'PARENT'
        ? db.attendance.findMany({
            where: {
              status: 'ABSENT',
              createdAt: { gte: threeDaysAgo },
            },
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
              class: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    // Build payment notifications
    for (const payment of recentPayments) {
      const studentName = `${payment.student.firstName} ${payment.student.lastName}`;
      notifications.push({
        id: `payment-${payment.id}`,
        type: 'PAYMENT',
        title: 'Fee Payment Received',
        description: `${studentName} paid KES ${payment.amount.toLocaleString()} for ${payment.feeStructure.name}`,
        timestamp: payment.createdAt.toISOString(),
        isRead: true, // Historical data is considered read
        link: `fees`,
        actorName: studentName,
      });
    }

    // Build attendance notifications (group by date, show summary)
    const attendanceByDate = new Map<string, { date: string; className: string; total: number; present: number; absent: number; records: typeof recentAttendance }>();
    for (const record of recentAttendance) {
      const dateKey = record.date.toISOString().split('T')[0];
      const classKey = `${dateKey}-${record.classId}`;
      if (!attendanceByDate.has(classKey)) {
        attendanceByDate.set(classKey, {
          date: dateKey,
          className: record.class.name,
          total: 0,
          present: 0,
          absent: 0,
          records: [],
        });
      }
      const entry = attendanceByDate.get(classKey)!;
      entry.total++;
      if (record.status === 'PRESENT' || record.status === 'LATE') entry.present++;
      if (record.status === 'ABSENT') entry.absent++;
      entry.records.push(record);
    }

    for (const [, entry] of attendanceByDate) {
      notifications.push({
        id: `attendance-${entry.date}-${entry.className}`,
        type: 'ATTENDANCE',
        title: 'Attendance Marked',
        description: `${entry.className}: ${entry.present}/${entry.total} students present${entry.absent > 0 ? ` (${entry.absent} absent)` : ''}`,
        timestamp: entry.records[0].createdAt.toISOString(),
        isRead: true,
        link: 'attendance',
      });
    }

    // Build exam marks notifications
    for (const mark of recentExamMarks) {
      const studentName = `${mark.student.firstName} ${mark.student.lastName}`;
      const grade = mark.marks >= 80 ? 'A' : mark.marks >= 70 ? 'B' : mark.marks >= 60 ? 'C' : mark.marks >= 50 ? 'D' : 'E';
      notifications.push({
        id: `exam-${mark.id}`,
        type: 'EXAM',
        title: 'Exam Marks Entered',
        description: `${studentName} scored ${mark.marks}/${mark.exam.name || 'Exam'} in ${mark.subject.name} (Grade: ${grade})`,
        timestamp: mark.createdAt.toISOString(),
        isRead: true,
        link: 'exams',
        actorName: studentName,
      });
    }

    // Build message notifications
    for (const msg of recentMessages) {
      const isIncoming = msg.receiverId === user.id;
      notifications.push({
        id: `message-${msg.id}`,
        type: 'MESSAGE',
        title: isIncoming ? `New Message from ${msg.sender.name}` : `Message Sent to ${msg.receiver.name}`,
        description: msg.subject,
        timestamp: msg.createdAt.toISOString(),
        isRead: isIncoming ? msg.isRead : true,
        link: 'messages',
        actorName: isIncoming ? msg.sender.name : undefined,
      });
    }

    // Build notice notifications
    for (const notice of recentNotices) {
      const isTargeted = notice.targetRoles === 'ALL' ||
        notice.targetRoles.split(',').includes(user.role) ||
        notice.targetRoles.split(',').includes('ALL');

      if (isTargeted) {
        notifications.push({
          id: `notice-${notice.id}`,
          type: 'NOTICE',
          title: notice.title,
          description: notice.content.length > 100
            ? notice.content.substring(0, 100) + '...'
            : notice.content,
          timestamp: (notice.publishedAt || notice.createdAt).toISOString(),
          isRead: false, // Notices are considered unread
          link: 'notices',
        });
      }
    }

    // Build absence notifications (for admin/teacher)
    for (const absence of recentAbsences) {
      if (absence.student) {
        const studentName = `${absence.student.firstName} ${absence.student.lastName}`;
        notifications.push({
          id: `absence-${absence.id}`,
          type: 'ATTENDANCE',
          title: 'Student Absence',
          description: `${studentName} (${absence.class?.name || 'Unknown class'}) was absent`,
          timestamp: absence.createdAt.toISOString(),
          isRead: true,
          link: 'attendance',
          actorName: studentName,
        });
      }
    }

    // Sort all notifications by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Count unread
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Add relative time
    const enrichedNotifications = notifications.slice(0, 20).map((n) => ({
      ...n,
      relativeTime: getRelativeTime(new Date(n.timestamp)),
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: enrichedNotifications,
        unreadCount,
        totalCount: notifications.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
