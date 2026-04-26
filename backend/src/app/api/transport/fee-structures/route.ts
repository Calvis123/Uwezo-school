import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import {
  addAllClassesScopeMarker,
  isAllClassesScopeDescription,
  removeAllClassesScopeMarker,
} from '@/lib/fee-structure-scope'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId') || undefined
    const classId = searchParams.get('classId') || undefined

    const structures = await db.feeStructure.findMany({
      where: {
        category: 'TRANSPORT',
        ...(termId ? { termId } : {}),
        ...(classId
          ? {
              OR: [
                { classId },
                { description: { startsWith: '[ALL_CLASSES]' } },
              ],
            }
          : {}),
      },
      include: {
        class: { select: { id: true, name: true, stream: true } },
        term: { select: { id: true, name: true, year: true, status: true } },
      },
      orderBy: [{ term: { year: 'desc' } }, { class: { name: 'asc' } }],
    })

    const normalized = structures.map((row) => {
      const appliesToAllClasses = isAllClassesScopeDescription(row.description)
      return {
        ...row,
        appliesToAllClasses,
        description: removeAllClassesScopeMarker(row.description),
        class: appliesToAllClasses
          ? { id: 'ALL', name: 'All Classes', stream: null }
          : row.class,
      }
    })

    return NextResponse.json({ success: true, data: normalized })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to fetch transport fee structures')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const body = await request.json()
    const { classId, termId, amount } = body || {}

    if (!classId || !termId || !amount) {
      return NextResponse.json(
        { success: false, error: 'classId, termId, and amount are required' },
        { status: 400 }
      )
    }

    const termItem = await db.term.findUnique({ where: { id: termId }, select: { id: true, name: true } })
    if (!termItem) {
      return NextResponse.json(
        { success: false, error: 'Invalid term' },
        { status: 400 }
      )
    }

    const name = `Transport Fee - ${termItem.name}`
    const amountNumber = Number(amount)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    const isAllClasses = String(classId) === 'ALL'

    if (isAllClasses) {
      const activeClasses = await db.schoolClass.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      })
      if (activeClasses.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No active classes found' },
          { status: 400 }
        )
      }

      const termTransportStructures = await db.feeStructure.findMany({
        where: {
          termId,
          category: 'TRANSPORT',
        },
        select: { id: true, amount: true, description: true, status: true },
      })

      const existingGlobal = termTransportStructures.find((row) =>
        isAllClassesScopeDescription(row.description)
      )
      const existingClassSpecific = termTransportStructures.filter(
        (row) => !isAllClassesScopeDescription(row.description) && row.status === 'ACTIVE'
      )

      if (!existingGlobal && existingClassSpecific.length > 0) {
        const classSpecificIds = existingClassSpecific.map((row) => row.id)
        const paymentsOnClassSpecific = await db.feeTransaction.count({
          where: {
            feeStructureId: { in: classSpecificIds },
            status: { in: ['COMPLETED', 'PENDING'] },
          },
        })
        if (paymentsOnClassSpecific > 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Cannot convert to all-classes transport structure because class-based transport payments already exist for this term.',
            },
            { status: 409 }
          )
        }

        await db.feeStructure.updateMany({
          where: { id: { in: classSpecificIds } },
          data: { status: 'INACTIVE' },
        })
      }

      if (existingGlobal) {
        const paymentsCount = await db.feeTransaction.count({
          where: {
            feeStructureId: existingGlobal.id,
            status: { in: ['COMPLETED', 'PENDING'] },
          },
        })
        if (paymentsCount > 0 && Number(existingGlobal.amount) !== amountNumber) {
          return NextResponse.json(
            {
              success: false,
              error:
                'This all-classes transport structure is locked because payments already exist. Create a new term structure instead.',
            },
            { status: 409 }
          )
        }

        const updated = await db.feeStructure.update({
          where: { id: existingGlobal.id },
          data: {
            amount: amountNumber,
            name,
            status: 'ACTIVE',
            description: addAllClassesScopeMarker('Transport fee applied to all active classes'),
          },
          include: {
            class: { select: { id: true, name: true, stream: true } },
            term: { select: { id: true, name: true, year: true, status: true } },
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            ...updated,
            appliesToAllClasses: true,
            class: { id: 'ALL', name: 'All Classes', stream: null },
            description: removeAllClassesScopeMarker(updated.description),
          },
        })
      }

      const created = await db.feeStructure.create({
        data: {
          classId: activeClasses[0].id,
          termId,
          amount: amountNumber,
          category: 'TRANSPORT',
          name,
          description: addAllClassesScopeMarker('Transport fee applied to all active classes'),
          status: 'ACTIVE',
        },
        include: {
          class: { select: { id: true, name: true, stream: true } },
          term: { select: { id: true, name: true, year: true, status: true } },
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          ...created,
          appliesToAllClasses: true,
          class: { id: 'ALL', name: 'All Classes', stream: null },
          description: removeAllClassesScopeMarker(created.description),
        },
      })
    }

    const classItem = await db.schoolClass.findUnique({ where: { id: classId }, select: { id: true, name: true } })
    if (!classItem) {
      return NextResponse.json(
        { success: false, error: 'Invalid class' },
        { status: 400 }
      )
    }

    const existingGlobal = await db.feeStructure.findFirst({
      where: {
        termId,
        category: 'TRANSPORT',
        description: { startsWith: '[ALL_CLASSES]' },
        status: 'ACTIVE',
      },
      select: { id: true },
    })
    if (existingGlobal) {
      return NextResponse.json(
        {
          success: false,
          error: 'An active all-classes transport fee already exists for this term. Update that one instead.',
        },
        { status: 409 }
      )
    }

    const existing = await db.feeStructure.findFirst({
      where: {
        classId,
        termId,
        category: 'TRANSPORT',
      },
      select: { id: true, amount: true, status: true },
    })

    if (existing) {
      const paymentsCount = await db.feeTransaction.count({
        where: {
          feeStructureId: existing.id,
          status: { in: ['COMPLETED', 'PENDING'] },
        },
      })

      if (paymentsCount > 0 && Number(existing.amount) !== amountNumber) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This transport fee structure is locked because payments already exist. Create a new term structure instead.',
          },
          { status: 409 }
        )
      }
    }

    const structure = existing
      ? await db.feeStructure.update({
          where: { id: existing.id },
          data: {
            amount: amountNumber,
            name,
            status: 'ACTIVE',
            description: 'Dedicated transport fee structure',
          },
          include: {
            class: { select: { id: true, name: true, stream: true } },
            term: { select: { id: true, name: true, year: true, status: true } },
          },
        })
      : await db.feeStructure.create({
          data: {
            classId,
            termId,
            amount: amountNumber,
            category: 'TRANSPORT',
            name,
            description: 'Dedicated transport fee structure',
            status: 'ACTIVE',
          },
          include: {
            class: { select: { id: true, name: true, stream: true } },
            term: { select: { id: true, name: true, year: true, status: true } },
          },
        })

    return NextResponse.json({ success: true, data: structure })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to save transport fee structure')
  }
}
