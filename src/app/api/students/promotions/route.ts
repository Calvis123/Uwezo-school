import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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
    if (academicYear) where.academicYear = academicYear
    if (term) where.term = term
    if (status) where.status = status
    if (fromClassId) where.fromClassId = fromClassId
    if (toClassId) where.toClassId = toClassId

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search } } },
        { student: { lastName: { contains: search } } },
        { student: { admissionNumber: { contains: search } } },
      ]
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
  } catch (error: any) {
    console.error('Promotions list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}
