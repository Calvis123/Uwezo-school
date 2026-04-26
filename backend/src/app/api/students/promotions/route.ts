import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { getTeacherAssignedClassIds } from '@/lib/teacher-access'

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER', 'TEACHER'] })

    const { searchParams } = new URL(request.url)
    const academicYear = searchParams.get('academicYear')
    const term = searchParams.get('term')
    const status = searchParams.get('status')
    const fromClassId = searchParams.get('fromClassId')
    const toClassId = searchParams.get('toClassId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    const andConditions: any[] = []
    if (academicYear) where.academicYear = academicYear
    if (term) where.term = term
    if (status) where.status = status
    if (fromClassId) where.fromClassId = fromClassId
    if (toClassId) where.toClassId = toClassId

    const teacherClassIds = await getTeacherAssignedClassIds(authed)
    if (teacherClassIds) {
      if (fromClassId && !teacherClassIds.includes(fromClassId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: source class is not assigned to this teacher' },
          { status: 403 }
        )
      }
      if (toClassId && !teacherClassIds.includes(toClassId)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: target class is not assigned to this teacher' },
          { status: 403 }
        )
      }

      andConditions.push({
        OR: [
        { fromClassId: { in: teacherClassIds } },
        { toClassId: { in: teacherClassIds } },
        ],
      })
    }

    if (search) {
      andConditions.push({
        OR: [
        { student: { firstName: { contains: search } } },
        { student: { lastName: { contains: search } } },
        { student: { admissionNumber: { contains: search } } },
        ],
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const [promotions, total, stats] = await Promise.all([
      db.promotionRecord.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          fromClass: { select: { id: true, name: true, stream: true } },
          toClass: { select: { id: true, name: true, stream: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.promotionRecord.count({ where }),
      db.promotionRecord.groupBy({
        by: ['status'],
        _count: true,
      }),
    ])

    const statsMap: Record<string, number> = {
      total: 0,
      PENDING: 0,
      APPROVED: 0,
      COMPLETED: 0,
    }
    stats.forEach(s => {
      statsMap.total += s._count
      if (s.status in statsMap) {
        statsMap[s.status] = s._count
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        promotions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: statsMap,
      },
    })
  } catch (error: unknown) {
    console.error('Promotions list error:', error)
    return apiRouteError(error, 'Failed to fetch promotions')
  }
}
