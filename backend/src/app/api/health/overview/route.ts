import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// GET /api/health/overview - School-wide health overview
export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Total students with health conditions
    const studentsWithConditions = await db.healthCondition.groupBy({
      by: ['studentId'],
    })

    // Conditions by type
    const conditionsByType = await db.healthCondition.groupBy({
      by: ['condition'],
      _count: { condition: true },
    })

    // Conditions by severity
    const conditionsBySeverity = await db.healthCondition.groupBy({
      by: ['severity'],
      _count: { severity: true },
    })

    // Chronic conditions count
    const chronicCount = await db.healthCondition.count({ where: { isChronic: true } })

    // Records by type
    const recordsByType = await db.healthRecord.groupBy({
      by: ['recordType'],
      _count: { recordType: true },
    })

    // Total health records
    const totalRecords = await db.healthRecord.count()

    // Active/ongoing records
    const activeRecords = await db.healthRecord.count({
      where: { status: { in: ['ACTIVE', 'ONGOING', 'MONITORING'] } },
    })

    // Upcoming follow-ups
    const upcomingFollowUps = await db.healthRecord.findMany({
      where: {
        followUpDate: { gte: new Date() },
        status: { in: ['ACTIVE', 'ONGOING', 'MONITORING'] },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { followUpDate: 'asc' },
      take: 10,
    })

    // Recent records (last 30 days)
    const recentRecords = await db.healthRecord.findMany({
      where: {
        date: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    })

    // This month visits (checkups, dental, eye exams)
    const thisMonthVisits = await db.healthRecord.count({
      where: {
        date: { gte: monthStart },
        recordType: { in: ['CHECKUP', 'DENTAL', 'EYE_EXAM'] },
      },
    })

    // Critical/Severe active records
    const criticalRecords = await db.healthRecord.count({
      where: {
        severity: { in: ['CRITICAL', 'SEVERE'] },
        status: { in: ['ACTIVE', 'ONGOING'] },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        totalStudentsWithConditions: studentsWithConditions.length,
        conditionsByType: conditionsByType.map((c) => ({ condition: c.condition, count: c._count.condition })),
        conditionsBySeverity: conditionsBySeverity.map((c) => ({ severity: c.severity, count: c._count.severity })),
        chronicConditionsCount: chronicCount,
        recordsByType: recordsByType.map((r) => ({ recordType: r.recordType, count: r._count.recordType })),
        totalRecords,
        activeRecords,
        upcomingFollowUps,
        recentRecords,
        thisMonthVisits,
        criticalRecords,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
