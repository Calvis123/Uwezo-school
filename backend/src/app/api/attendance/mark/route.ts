import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { apiRouteError } from '@/lib/api-route-error';
import { canTeacherAccessClass } from '@/lib/teacher-access';

const VALID_ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, termId, date, records } = body;

    const authed = await requireUser(request, { roles: ['TEACHER'] });

    if (!classId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Class, date, and attendance records are required' },
        { status: 400 }
      );
    }

    const resolvedTermId = termId || (await db.term.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } }))?.id;
    if (!resolvedTermId) {
      return NextResponse.json(
        { success: false, error: 'No active term found. Please set an active term first.' },
        { status: 400 }
      );
    }

    const canAccessClass = await canTeacherAccessClass(authed, classId);
    if (!canAccessClass) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: class is not assigned to this teacher' },
        { status: 403 }
      );
    }

    const recordStudentIds = records.map((record: any) => record.studentId).filter(Boolean);
    if (recordStudentIds.length > 0) {
      const validStudentsCount = await db.student.count({
        where: {
          id: { in: recordStudentIds },
          classId,
        },
      });
      if (validStudentsCount !== recordStudentIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some attendance records contain students outside the selected class' },
          { status: 400 }
        );
      }
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const attendanceDateEnd = new Date(date);
    attendanceDateEnd.setHours(23, 59, 59, 999);

    const results = [];

    for (const record of records) {
      const { studentId, status: attendanceStatus, reason } = record;

      if (!studentId) continue;

      const normalizedStatus =
        typeof attendanceStatus === 'string' ? attendanceStatus.toUpperCase() : null;

      if (normalizedStatus && !VALID_ATTENDANCE_STATUSES.has(normalizedStatus)) {
        return NextResponse.json(
          { success: false, error: `Invalid attendance status for student ${studentId}` },
          { status: 400 }
        );
      }

      // Check if attendance already exists for this student on this date
      const existing = await db.attendance.findFirst({
        where: {
          studentId,
          classId,
          termId: resolvedTermId,
          date: {
            gte: attendanceDate,
            lte: attendanceDateEnd,
          },
        },
      });

      let result;
      if (!normalizedStatus) {
        if (existing) {
          await db.attendance.delete({ where: { id: existing.id } });
        }
        continue;
      }

      if (existing) {
        result = await db.attendance.update({
          where: { id: existing.id },
          data: {
            status: normalizedStatus,
            reason: typeof reason === 'string' ? reason : existing.reason,
            markedBy: authed.id,
          },
        });
      } else {
        result = await db.attendance.create({
          data: {
            studentId,
            classId,
            termId: resolvedTermId,
            date: attendanceDate,
            status: normalizedStatus,
            reason,
            markedBy: authed.id,
          },
        });
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      data: {
        saved: results.length,
        records: results,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error marking attendance:', error);
    return apiRouteError(error, 'Failed to mark attendance');
  }
}
