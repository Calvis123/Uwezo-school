import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// GET /api/health/conditions - List chronic conditions with filters
export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const condition = searchParams.get('condition')
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Prisma.HealthConditionWhereInput = {}

    if (studentId) where.studentId = studentId
    if (condition) where.condition = condition
    if (severity) where.severity = severity
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { notes: { contains: search } },
        { student: { OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { admissionNumber: { contains: search } },
        ]}},
      ]
    }

    const [conditions, total] = await Promise.all([
      db.healthCondition.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.healthCondition.count({ where }),
    ])

    // Stats
    const [totalStudents, severeCases, conditionTypes] = await Promise.all([
      db.healthCondition.groupBy({
        by: ['studentId'],
        _count: true,
      }),
      db.healthCondition.count({ where: { severity: { in: ['MODERATE', 'SEVERE'] } } }),
      db.healthCondition.groupBy({
        by: ['condition'],
        _count: { condition: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: conditions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        totalStudentsWithConditions: totalStudents.length,
        severeCases,
        conditionTypes: conditionTypes.map((c) => ({ condition: c.condition, count: c._count.condition })),
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}

// POST /api/health/conditions - Create new condition
export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const body = await request.json()
    const { studentId, condition, description, severity, isChronic, diagnosedDate, notes } = body

    if (!studentId || !condition) {
      return NextResponse.json({ success: false, error: 'studentId and condition are required' }, { status: 400 })
    }

    const record = await db.healthCondition.create({
      data: {
        studentId,
        condition,
        description: description || '',
        severity: severity || 'MILD',
        isChronic: isChronic ?? false,
        diagnosedDate: diagnosedDate ? new Date(diagnosedDate) : null,
        notes: notes || '',
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
