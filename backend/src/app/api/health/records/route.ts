import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// GET /api/health/records - List health records with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const studentId = searchParams.get('studentId')
    const recordType = searchParams.get('recordType')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.HealthRecordWhereInput = {}

    if (studentId) where.studentId = studentId
    if (recordType) where.recordType = recordType
    if (severity) where.severity = severity
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { treatedBy: { contains: search } },
        { student: { OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { admissionNumber: { contains: search } },
        ]}},
      ]
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const [records, total] = await Promise.all([
      db.healthRecord.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.healthRecord.count({ where }),
    ])

    // Aggregated stats
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [activeConditions, upcomingFollowUps, recentVisits] = await Promise.all([
      db.healthCondition.count({ where: { isChronic: true } }),
      db.healthRecord.count({
        where: {
          followUpDate: { gte: new Date() },
          status: { in: ['ACTIVE', 'ONGOING', 'MONITORING'] },
        },
      }),
      db.healthRecord.count({
        where: {
          date: { gte: monthStart },
          recordType: { in: ['CHECKUP', 'DENTAL', 'EYE_EXAM'] },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalRecords: total,
        activeConditions,
        upcomingFollowUps,
        recentVisits,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}

// POST /api/health/records - Create new health record
export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const body = await request.json()
    const { studentId, recordType, title, description, date, severity, status, treatedBy, attachments, followUpDate } = body

    if (!studentId || !recordType || !title) {
      return NextResponse.json({ success: false, error: 'studentId, recordType, and title are required' }, { status: 400 })
    }

    const record = await db.healthRecord.create({
      data: {
        studentId,
        recordType,
        title,
        description: description || '',
        date: date ? new Date(date) : new Date(),
        severity: severity || 'MILD',
        status: status || 'RESOLVED',
        treatedBy: treatedBy || '',
        attachments: attachments || '',
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
