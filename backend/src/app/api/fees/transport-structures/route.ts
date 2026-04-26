import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { addAllClassesScopeMarker, isAllClassesScopeDescription } from '@/lib/fee-structure-scope'

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const body = await request.json()
    const { termId } = body || {}

    if (!termId) {
      return NextResponse.json(
        { success: false, error: 'termId is required' },
        { status: 400 }
      )
    }

    const [classes, existing] = await Promise.all([
      db.schoolClass.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
      }),
      db.feeStructure.findMany({
        where: {
          termId,
          category: 'TRANSPORT',
        },
        select: { id: true, classId: true, description: true },
      }),
    ])

    const existingGlobal = existing.find((row) => isAllClassesScopeDescription((row as any).description))
    if (existingGlobal) {
      return NextResponse.json({
        success: true,
        data: {
          createdCount: 0,
          skippedCount: classes.length,
          created: [],
          skipped: classes.map((item) => ({
            classId: item.id,
            className: item.name,
            reason: 'All-classes transport structure already exists for this term',
          })),
        },
      })
    }

    const existingByClass = new Set(
      existing
        .filter((row) => !isAllClassesScopeDescription((row as any).description))
        .map((row) => row.classId)
    )
    const created: any[] = []
    const skipped: any[] = []

    for (const schoolClass of classes) {
      if (existingByClass.has(schoolClass.id)) {
        skipped.push({ classId: schoolClass.id, className: schoolClass.name, reason: 'Already exists' })
        continue
      }

      const previousTransport = await db.feeStructure.findFirst({
        where: {
          category: 'TRANSPORT',
          termId: { not: termId },
          OR: [
            { classId: schoolClass.id },
            { description: { startsWith: '[ALL_CLASSES]' } },
          ],
        },
        orderBy: [{ term: { year: 'desc' } }, { createdAt: 'desc' }],
        select: {
          amount: true,
          name: true,
          description: true,
        },
      })

      if (!previousTransport) {
        skipped.push({
          classId: schoolClass.id,
          className: schoolClass.name,
          reason: 'No previous transport structure to copy',
        })
        continue
      }

      const structure = await db.feeStructure.create({
        data: {
          name: previousTransport.name || 'Transport Fee',
          classId: schoolClass.id,
          termId,
          amount: previousTransport.amount,
          category: 'TRANSPORT',
          description: isAllClassesScopeDescription(previousTransport.description)
            ? addAllClassesScopeMarker('Transport fee applied to all active classes')
            : (previousTransport.description || 'Copied from previous term'),
          status: 'ACTIVE',
        },
        select: {
          id: true,
          classId: true,
          amount: true,
          name: true,
        },
      })

      created.push({
        classId: schoolClass.id,
        className: schoolClass.name,
        structure,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        createdCount: created.length,
        skippedCount: skipped.length,
        created,
        skipped,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to create transport structures for term')
  }
}
