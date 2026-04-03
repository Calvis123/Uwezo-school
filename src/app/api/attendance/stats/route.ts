import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const termId = searchParams.get('termId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Determine term
    let activeTermId = termId;
    if (!activeTermId) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
      });
      activeTermId = activeTerm?.id || '';
    }

    // Build date range
    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.gte.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
      dateFilter.lte.setHours(23, 59, 59, 999);
    }

    // Class-wise statistics
    const classStats = await db.schoolClass.findMany({
      include: {
        _count: {
          select: { students: true },
        },
        attendances: {
          where: {
            ...(activeTermId ? { termId: activeTermId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
          },
        },
      },
    });

    const classWiseStats = classStats.map((cls) => {
      const totalRecords = cls.attendances.length;
      const present = cls.attendances.filter((a) => a.status === 'PRESENT').length;
      const absent = cls.attendances.filter((a) => a.status === 'ABSENT').length;
      const late = cls.attendances.filter((a) => a.status === 'LATE').length;
      const excused = cls.attendances.filter((a) => a.status === 'EXCUSED').length;

      return {
        classId: cls.id,
        className: cls.name,
        level: cls.level,
        stream: cls.stream,
        totalStudents: cls._count.students,
        totalRecords,
        present,
        absent,
        late,
        excused,
        attendanceRate: totalRecords > 0
          ? Math.round(((present + late) / totalRecords) * 100 * 100) / 100
          : 0,
      };
    });

    // Student-wise statistics
    const studentWhere: any = { status: 'ACTIVE' };
    if (classId) studentWhere.classId = classId;

    const students = await db.student.findMany({
      where: studentWhere,
      include: {
        class: true,
        attendances: {
          where: {
            ...(activeTermId ? { termId: activeTermId } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
          },
        },
      },
    });

    const studentWiseStats = students.map((student) => {
      const totalRecords = student.attendances.length;
      const present = student.attendances.filter((a) => a.status === 'PRESENT').length;
      const absent = student.attendances.filter((a) => a.status === 'ABSENT').length;
      const late = student.attendances.filter((a) => a.status === 'LATE').length;
      const excused = student.attendances.filter((a) => a.status === 'EXCUSED').length;

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class.name,
        totalRecords,
        present,
        absent,
        late,
        excused,
        attendanceRate: totalRecords > 0
          ? Math.round(((present + late) / totalRecords) * 100 * 100) / 100
          : 0,
      };
    });

    // Sort by attendance rate ascending to identify at-risk students first
    studentWiseStats.sort((a, b) => a.attendanceRate - b.attendanceRate);

    // Overall summary
    const allAttendance = await db.attendance.findMany({
      where: {
        ...(activeTermId ? { termId: activeTermId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
    });

    const totalRecords = allAttendance.length;
    const totalPresent = allAttendance.filter((a) => a.status === 'PRESENT').length;
    const totalAbsent = allAttendance.filter((a) => a.status === 'ABSENT').length;
    const totalLate = allAttendance.filter((a) => a.status === 'LATE').length;
    const totalExcused = allAttendance.filter((a) => a.status === 'EXCUSED').length;
    const overallRate = totalRecords > 0
      ? Math.round(((totalPresent + totalLate) / totalRecords) * 100 * 100) / 100
      : 0;

    // Unique days with attendance
    const uniqueDays = new Set(allAttendance.map((a) => a.date.toISOString().split('T')[0])).size;

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalRecords,
          present: totalPresent,
          absent: totalAbsent,
          late: totalLate,
          excused: totalExcused,
          attendanceRate: overallRate,
          totalDays: uniqueDays,
        },
        classWise: classWiseStats,
        studentWise: studentWiseStats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching attendance stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance statistics' },
      { status: 500 }
    );
  }
}
