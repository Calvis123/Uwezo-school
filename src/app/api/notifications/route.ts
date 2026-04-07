import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isNotificationRead, isAllRead } from '@/lib/notification-state';

interface NotificationItem {
  id: string;
  type: 'PAYMENT' | 'ATTENDANCE' | 'EXAM' | 'MESSAGE' | 'NOTICE' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  link: string;
  actorName?: string;
  relativeTime: string;
  timeGroup: 'today' | 'yesterday' | 'earlier';
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

function getTimeGroup(date: Date): 'today' | 'yesterday' | 'earlier' {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate.getTime() >= today.getTime()) return 'today';
  if (notifDate.getTime() >= yesterday.getTime()) return 'yesterday';
  return 'earlier';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    // Fetch user from DB to get role
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
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
      const id = `payment-${payment.id}`;
      notifications.push({
        id,
        type: 'PAYMENT',
        title: 'Fee Payment Received',
        description: `${studentName} paid KES ${payment.amount.toLocaleString()} for ${payment.feeStructure.name}`,
        timestamp: payment.createdAt.toISOString(),
        isRead: isNotificationRead(id) || isAllRead(),
        link: 'fees',
        actorName: studentName,
        relativeTime: getRelativeTime(payment.createdAt),
        timeGroup: getTimeGroup(payment.createdAt),
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
      const id = `attendance-${entry.date}-${entry.className}`;
      const timestamp = entry.records[0].createdAt;
      notifications.push({
        id,
        type: 'ATTENDANCE',
        title: 'Attendance Marked',
        description: `${entry.className}: ${entry.present}/${entry.total} students present${entry.absent > 0 ? ` (${entry.absent} absent)` : ''}`,
        timestamp: timestamp.toISOString(),
        isRead: isNotificationRead(id) || isAllRead(),
        link: 'attendance',
        relativeTime: getRelativeTime(timestamp),
        timeGroup: getTimeGroup(timestamp),
      });
    }

    // Build exam marks notifications
    for (const mark of recentExamMarks) {
      const studentName = `${mark.student.firstName} ${mark.student.lastName}`;
      const grade = mark.marks >= 80 ? 'A' : mark.marks >= 70 ? 'B' : mark.marks >= 60 ? 'C' : mark.marks >= 50 ? 'D' : 'E';
      const id = `exam-${mark.id}`;
      notifications.push({
        id,
        type: 'EXAM',
        title: 'Exam Results Available',
        description: `${studentName} scored ${mark.marks}/${mark.exam.name || 'Exam'} in ${mark.subject.name} (Grade: ${grade})`,
        timestamp: mark.createdAt.toISOString(),
        isRead: isNotificationRead(id) || isAllRead(),
        link: 'exams',
        actorName: studentName,
        relativeTime: getRelativeTime(mark.createdAt),
        timeGroup: getTimeGroup(mark.createdAt),
      });
    }

    // Build message notifications
    for (const msg of recentMessages) {
      const isIncoming = msg.receiverId === user.id;
      const id = `message-${msg.id}`;
      notifications.push({
        id,
        type: 'MESSAGE',
        title: isIncoming ? `New Message from ${msg.sender.name}` : `Message Sent to ${msg.receiver.name}`,
        description: msg.subject,
        timestamp: msg.createdAt.toISOString(),
        isRead: isIncoming ? (msg.isRead || isNotificationRead(id) || isAllRead()) : (isNotificationRead(id) || isAllRead()),
        link: 'messages',
        actorName: isIncoming ? msg.sender.name : undefined,
        relativeTime: getRelativeTime(msg.createdAt),
        timeGroup: getTimeGroup(msg.createdAt),
      });
    }

    // Build notice notifications
    for (const notice of recentNotices) {
      const isTargeted = notice.targetRoles === 'ALL' ||
        notice.targetRoles.split(',').includes(user.role) ||
        notice.targetRoles.split(',').includes('ALL');

      if (isTargeted) {
        const id = `notice-${notice.id}`;
        const publishDate = notice.publishedAt || notice.createdAt;
        notifications.push({
          id,
          type: 'NOTICE',
          title: notice.title,
          description: notice.content.length > 100
            ? notice.content.substring(0, 100) + '...'
            : notice.content,
          timestamp: publishDate.toISOString(),
          isRead: isNotificationRead(id) || isAllRead(),
          link: 'notices',
          relativeTime: getRelativeTime(publishDate),
          timeGroup: getTimeGroup(publishDate),
        });
      }
    }

    // Build absence notifications (for admin/teacher)
    for (const absence of recentAbsences) {
      if (absence.student) {
        const studentName = `${absence.student.firstName} ${absence.student.lastName}`;
        const id = `absence-${absence.id}`;
        notifications.push({
          id,
          type: 'ATTENDANCE',
          title: 'Student Absence Alert',
          description: `${studentName} (${absence.class?.name || 'Unknown class'}) was absent`,
          timestamp: absence.createdAt.toISOString(),
          isRead: isNotificationRead(id) || isAllRead(),
          link: 'attendance',
          actorName: studentName,
          relativeTime: getRelativeTime(absence.createdAt),
          timeGroup: getTimeGroup(absence.createdAt),
        });
      }
    }

    // Sort all notifications by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Count unread
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Group by time
    const grouped: { today: NotificationItem[]; yesterday: NotificationItem[]; earlier: NotificationItem[] } = {
      today: notifications.filter((n) => n.timeGroup === 'today'),
      yesterday: notifications.filter((n) => n.timeGroup === 'yesterday'),
      earlier: notifications.filter((n) => n.timeGroup === 'earlier'),
    };

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.slice(0, 30),
        grouped,
        unreadCount,
        totalCount: notifications.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
