import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, termId, date, records, markedBy } = body;

    if (!classId || !termId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Class, term, date, and attendance records are required' },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];

    for (const record of records) {
      const { studentId, status: attendanceStatus, reason } = record;

      if (!studentId || !attendanceStatus) continue;

      // Check if attendance already exists for this student on this date
      const existing = await db.attendance.findFirst({
        where: {
          studentId,
          classId,
          termId,
          date: attendanceDate,
        },
      });

      let result;
      if (existing) {
        result = await db.attendance.update({
          where: { id: existing.id },
          data: {
            status: attendanceStatus,
            reason: reason || existing.reason,
            markedBy: markedBy || existing.markedBy,
          },
        });
      } else {
        result = await db.attendance.create({
          data: {
            studentId,
            classId,
            termId,
            date: attendanceDate,
            status: attendanceStatus,
            reason,
            markedBy,
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
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}
