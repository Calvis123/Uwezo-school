import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isNotificationRead, isAllRead } from '@/lib/notification-state';
import { requireUser } from '@/lib/auth-server';
import { ALL_ROLES, FINANCE_ROLES } from '@/lib/roles';
import { MARKED_ATTENDANCE_STATUSES } from '@/lib/attendance';
import { apiRouteError } from '@/lib/api-route-error';
import { getParentScopedStudentIds } from '@/lib/parent-access';

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

function canUserViewNotice(targetRoles: string, userRole: string): boolean {
  const normalizedRole = userRole.toUpperCase();
  const targets = (targetRoles || 'ALL')
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);

  if (targets.includes('ALL')) return true;
  if (targets.includes(normalizedRole)) return true;
  if (targets.includes('STAFF') && normalizedRole !== 'PARENT') return true;
  if (targets.includes('PARENT') && normalizedRole === 'PARENT') return true;
  return false;
}

function resolveNotificationLink(type: NotificationItem['type'], role: string): string {
  const normalizedRole = role.toUpperCase();

  if (normalizedRole === 'PARENT') {
    if (type === 'PAYMENT') return 'fees';
    if (type === 'MESSAGE') return 'messages';
    if (type === 'NOTICE') return 'notices';
    return 'parent-dashboard';
  }

  if (normalizedRole === 'TEACHER') {
    if (type === 'ATTENDANCE') return 'attendance';
    if (type === 'EXAM') return 'exams';
    if (type === 'MESSAGE') return 'messages';
    if (type === 'NOTICE') return 'notices';
    return 'teacher-dashboard';
  }

  if (type === 'PAYMENT') return 'fees';
  if (type === 'ATTENDANCE') {
    if (normalizedRole === 'DOS') return 'class-reports';
    if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN' || normalizedRole === 'HEADTEACHER' || normalizedRole === 'TEACHER') {
      return 'attendance';
    }
    return 'dashboard';
  }
  if (type === 'EXAM') return 'exams';
  if (type === 'MESSAGE') return 'messages';
  if (type === 'NOTICE') return 'notices';
  return 'dashboard';
}

function getRoleCapabilities(role: string) {
  const normalizedRole = role.toUpperCase();
  const canSeeFinanceNotifications = normalizedRole === 'PARENT' || FINANCE_ROLES.includes(normalizedRole as any);
  const canSeeAttendanceNotifications =
    normalizedRole === 'PARENT' ||
    ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'TEACHER', 'DOS'].includes(normalizedRole);
  const canSeeExamNotifications =
    normalizedRole === 'PARENT' ||
    ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER'].includes(normalizedRole);
  const canSeeAbsenceAlerts = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'TEACHER'].includes(normalizedRole);

  return {
    canSeeFinanceNotifications,
    canSeeAttendanceNotifications,
    canSeeExamNotifications,
    canSeeAbsenceAlerts,
  };
}

function canRoleAccessLink(role: string, link: string): boolean {
  const normalizedRole = role.toUpperCase();
  const roleViewAccess: Record<string, Set<string>> = {
    SUPER_ADMIN: new Set(['dashboard', 'fees', 'attendance', 'class-reports', 'exams', 'messages', 'notices']),
    ADMIN: new Set(['dashboard', 'fees', 'attendance', 'class-reports', 'exams', 'messages', 'notices']),
    HEADTEACHER: new Set(['dashboard', 'fees', 'attendance', 'class-reports', 'exams', 'messages', 'notices']),
    DOS: new Set(['dashboard', 'class-reports', 'exams', 'messages', 'notices']),
    BURSAR: new Set(['dashboard', 'fees', 'messages', 'notices']),
    TEACHER: new Set(['teacher-dashboard', 'attendance', 'class-reports', 'exams', 'messages', 'notices']),
    SECRETARY: new Set(['dashboard', 'messages', 'notices']),
    PARENT: new Set(['parent-dashboard', 'fees', 'messages', 'notices']),
  };

  const allowed = roleViewAccess[normalizedRole];
  if (!allowed) return false;
  return allowed.has(link);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });
    const role = user.role.toUpperCase();

    const isParent = role === 'PARENT';
    const isTeacher = role === 'TEACHER';
    const {
      canSeeFinanceNotifications,
      canSeeAttendanceNotifications,
      canSeeExamNotifications,
      canSeeAbsenceAlerts,
    } = getRoleCapabilities(role);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [parentStudentIds, teacherClassIds] = await Promise.all([
      isParent
        ? getParentScopedStudentIds(user.id)
        : Promise.resolve([] as string[]),
      isTeacher
        ? db.schoolClass
            .findMany({
              where: { teacherId: user.id },
              select: { id: true },
            })
            .then((rows) => rows.map((row) => row.id))
        : Promise.resolve([] as string[]),
    ]);

    if (isParent && parentStudentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [],
          grouped: { today: [], yesterday: [], earlier: [] },
          unreadCount: 0,
          totalCount: 0,
        },
      });
    }

    const paymentWhere = {
      status: 'COMPLETED',
      createdAt: { gte: sevenDaysAgo },
      ...(isParent ? { studentId: { in: parentStudentIds } } : {}),
    };

    const attendanceScopeWhere = {
      createdAt: { gte: threeDaysAgo },
      status: { in: [...MARKED_ATTENDANCE_STATUSES] },
      ...(isParent ? { studentId: { in: parentStudentIds } } : {}),
      ...(isTeacher ? { classId: { in: teacherClassIds } } : {}),
    };

    const examWhere = {
      createdAt: { gte: sevenDaysAgo },
      ...(isParent ? { studentId: { in: parentStudentIds } } : {}),
      ...(isTeacher ? { exam: { classId: { in: teacherClassIds } } } : {}),
    };

    const [
      recentPayments,
      recentAttendance,
      recentExamMarks,
      recentMessages,
      recentNotices,
      recentAbsences,
    ] = await Promise.all([
      canSeeFinanceNotifications
        ? db.feeTransaction.findMany({
            where: paymentWhere,
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
              feeStructure: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),

      canSeeAttendanceNotifications
        ? db.attendance.findMany({
            where: attendanceScopeWhere,
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
              class: { select: { id: true, name: true } },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            take: isParent ? 10 : 12,
          })
        : Promise.resolve([]),

      canSeeExamNotifications
        ? db.examMark.findMany({
            where: examWhere,
            include: {
              exam: { select: { id: true, name: true, classId: true } },
              student: { select: { id: true, firstName: true, lastName: true } },
              subject: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),

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
        take: 8,
      }),

      db.schoolNotice.findMany({
        where: {
          isPublished: true,
          publishedAt: { gte: sevenDaysAgo },
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
      }),

      canSeeAbsenceAlerts
        ? db.attendance.findMany({
            where: {
              status: 'ABSENT',
              createdAt: { gte: threeDaysAgo },
              ...(isTeacher ? { classId: { in: teacherClassIds } } : {}),
            },
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
              class: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
          })
        : Promise.resolve([]),
    ]);

    const notifications: NotificationItem[] = [];

    for (const payment of recentPayments) {
      const studentName = `${payment.student.firstName} ${payment.student.lastName}`;
      const id = `payment-${payment.id}`;
      notifications.push({
        id,
        type: 'PAYMENT',
        title: 'Fee Payment Received',
        description: `${studentName} paid KES ${payment.amount.toLocaleString()} for ${payment.feeStructure.name}`,
        timestamp: payment.createdAt.toISOString(),
        isRead: isNotificationRead(user.id, id) || isAllRead(user.id, payment.createdAt),
        link: resolveNotificationLink('PAYMENT', role),
        actorName: studentName,
        relativeTime: getRelativeTime(payment.createdAt),
        timeGroup: getTimeGroup(payment.createdAt),
      });
    }

    if (canSeeAttendanceNotifications && isParent) {
      for (const record of recentAttendance) {
        const studentName = `${record.student.firstName} ${record.student.lastName}`;
        const id = `attendance-${record.id}`;
        notifications.push({
          id,
          type: 'ATTENDANCE',
          title: 'Attendance Updated',
          description: `${studentName} was ${record.status.toLowerCase()} on ${record.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
          timestamp: record.createdAt.toISOString(),
          isRead: isNotificationRead(user.id, id) || isAllRead(user.id, record.createdAt),
          link: resolveNotificationLink('ATTENDANCE', role),
          actorName: studentName,
          relativeTime: getRelativeTime(record.createdAt),
          timeGroup: getTimeGroup(record.createdAt),
        });
      }
    } else if (canSeeAttendanceNotifications) {
      const attendanceByDateAndClass = new Map<
        string,
        {
          date: string;
          classId: string;
          className: string;
          total: number;
          present: number;
          absent: number;
          records: typeof recentAttendance;
        }
      >();

      for (const record of recentAttendance) {
        const dateKey = record.date.toISOString().split('T')[0];
        const key = `${dateKey}-${record.classId}`;
        if (!attendanceByDateAndClass.has(key)) {
          attendanceByDateAndClass.set(key, {
            date: dateKey,
            classId: record.classId,
            className: record.class.name,
            total: 0,
            present: 0,
            absent: 0,
            records: [],
          });
        }
        const entry = attendanceByDateAndClass.get(key)!;
        entry.total += 1;
        if (record.status === 'PRESENT' || record.status === 'LATE') entry.present += 1;
        if (record.status === 'ABSENT') entry.absent += 1;
        entry.records.push(record);
      }

      for (const [, entry] of attendanceByDateAndClass) {
        const id = `attendance-${entry.date}-${entry.classId}`;
        const timestamp = entry.records[0].createdAt;
        notifications.push({
          id,
          type: 'ATTENDANCE',
          title: 'Attendance Marked',
          description: `${entry.className}: ${entry.present}/${entry.total} students present${entry.absent > 0 ? ` (${entry.absent} absent)` : ''}`,
          timestamp: timestamp.toISOString(),
          isRead: isNotificationRead(user.id, id) || isAllRead(user.id, timestamp),
          link: resolveNotificationLink('ATTENDANCE', role),
          relativeTime: getRelativeTime(timestamp),
          timeGroup: getTimeGroup(timestamp),
        });
      }
    }

    for (const mark of canSeeExamNotifications ? recentExamMarks : []) {
      const studentName = `${mark.student.firstName} ${mark.student.lastName}`;
      const grade = mark.marks >= 80 ? 'A' : mark.marks >= 70 ? 'B' : mark.marks >= 60 ? 'C' : mark.marks >= 50 ? 'D' : 'E';
      const id = `exam-${mark.id}`;
      notifications.push({
        id,
        type: 'EXAM',
        title: isParent ? 'Student Results Updated' : 'Exam Results Available',
        description: isParent
          ? `${studentName}: ${mark.subject.name} ${mark.marks}/${mark.exam.name || 'Exam'} (Grade ${grade})`
          : `${studentName} scored ${mark.marks}/${mark.exam.name || 'Exam'} in ${mark.subject.name} (Grade: ${grade})`,
        timestamp: mark.createdAt.toISOString(),
        isRead: isNotificationRead(user.id, id) || isAllRead(user.id, mark.createdAt),
        link: resolveNotificationLink('EXAM', role),
        actorName: studentName,
        relativeTime: getRelativeTime(mark.createdAt),
        timeGroup: getTimeGroup(mark.createdAt),
      });
    }

    for (const msg of recentMessages) {
      const isIncoming = msg.receiverId === user.id;
      const id = `message-${msg.id}`;
      notifications.push({
        id,
        type: 'MESSAGE',
        title: isIncoming ? `New Message from ${msg.sender.name}` : `Message Sent to ${msg.receiver.name}`,
        description: msg.subject,
        timestamp: msg.createdAt.toISOString(),
        isRead: isIncoming
          ? msg.isRead || isNotificationRead(user.id, id) || isAllRead(user.id, msg.createdAt)
          : isNotificationRead(user.id, id) || isAllRead(user.id, msg.createdAt),
        link: resolveNotificationLink('MESSAGE', role),
        actorName: isIncoming ? msg.sender.name : undefined,
        relativeTime: getRelativeTime(msg.createdAt),
        timeGroup: getTimeGroup(msg.createdAt),
      });
    }

    for (const notice of recentNotices) {
      if (!canUserViewNotice(notice.targetRoles, role)) continue;
      const id = `notice-${notice.id}`;
      const publishDate = notice.publishedAt || notice.createdAt;
      notifications.push({
        id,
        type: 'NOTICE',
        title: notice.title,
        description: notice.content.length > 100 ? `${notice.content.substring(0, 100)}...` : notice.content,
        timestamp: publishDate.toISOString(),
        isRead: isNotificationRead(user.id, id) || isAllRead(user.id, publishDate),
        link: resolveNotificationLink('NOTICE', role),
        relativeTime: getRelativeTime(publishDate),
        timeGroup: getTimeGroup(publishDate),
      });
    }

    for (const absence of canSeeAbsenceAlerts ? recentAbsences : []) {
      if (!absence.student) continue;
      const studentName = `${absence.student.firstName} ${absence.student.lastName}`;
      const id = `absence-${absence.id}`;
      notifications.push({
        id,
        type: 'ATTENDANCE',
        title: 'Student Absence Alert',
        description: `${studentName} (${absence.class?.name || 'Unknown class'}) was absent`,
        timestamp: absence.createdAt.toISOString(),
        isRead: isNotificationRead(user.id, id) || isAllRead(user.id, absence.createdAt),
        link: resolveNotificationLink('ATTENDANCE', role),
        actorName: studentName,
        relativeTime: getRelativeTime(absence.createdAt),
        timeGroup: getTimeGroup(absence.createdAt),
      });
    }

    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const uniqueById = new Map<string, NotificationItem>();
    for (const notification of notifications) {
      if (!canRoleAccessLink(role, notification.link)) continue;
      if (!uniqueById.has(notification.id)) uniqueById.set(notification.id, notification);
    }
    const dedupedNotifications = Array.from(uniqueById.values());

    const unreadCount = dedupedNotifications.filter((n) => !n.isRead).length;
    const grouped = {
      today: dedupedNotifications.filter((n) => n.timeGroup === 'today'),
      yesterday: dedupedNotifications.filter((n) => n.timeGroup === 'yesterday'),
      earlier: dedupedNotifications.filter((n) => n.timeGroup === 'earlier'),
    };

    return NextResponse.json({
      success: true,
      data: {
        notifications: dedupedNotifications.slice(0, 30),
        grouped,
        unreadCount,
        totalCount: dedupedNotifications.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching notifications:', error);
    return apiRouteError(error, 'Failed to fetch notifications');
  }
}
