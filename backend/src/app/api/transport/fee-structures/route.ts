import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import {
  FEE_CLASS_SCOPES,
  FeeClassScope,
  addClassScopeMarker,
  addAllClassesScopeMarker,
  addTransportRouteMarker,
  getClassScopeFromDescription,
  getTransportRouteFromDescription,
  getTransportFeeScopeForClass,
  isAllClassesScopeDescription,
  isTransportFeeGroup,
  removeFeeScopeMarkers,
} from '@/lib/fee-structure-scope'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId') || undefined
    const classId = searchParams.get('classId') || undefined

    const [structures, activeClasses] = await Promise.all([
      db.feeStructure.findMany({
      where: {
        category: 'TRANSPORT',
        status: 'ACTIVE',
        ...(termId ? { termId } : {}),
      },
      include: {
        class: { select: { id: true, name: true, stream: true, level: true } },
        term: { select: { id: true, name: true, year: true, status: true } },
      },
      orderBy: [{ term: { year: 'desc' } }, { class: { name: 'asc' } }],
      }),
      db.schoolClass.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, level: true },
      }),
    ])

    const classScopeById = new Map(activeClasses.map((item) => [item.id, getTransportFeeScopeForClass(item)]))
    const classIdsByScope = activeClasses.reduce<Record<string, string[]>>((acc, cls) => {
      const scope = getTransportFeeScopeForClass(cls)
      if (!scope) return acc
      if (!acc[scope]) acc[scope] = []
      acc[scope].push(cls.id)
      return acc
    }, {})
    const requestedFilterScopeValue = classId && classId.startsWith('SCOPE_') ? classId.replace('SCOPE_', '') : null
    const requestedFilterScope = requestedFilterScopeValue && requestedFilterScopeValue in FEE_CLASS_SCOPES
      ? requestedFilterScopeValue as FeeClassScope
      : null
    const selectedClassScope = requestedFilterScope || (classId ? classScopeById.get(classId) : null)

    const normalized = structures
      .map((row) => {
      const appliesToAllClasses = isAllClassesScopeDescription(row.description)
      const classScope = getClassScopeFromDescription(row.description)
      const transportRouteName = getTransportRouteFromDescription(row.description)
      return {
        ...row,
        appliesToAllClasses,
        classScope,
        classScopeLabel: classScope ? FEE_CLASS_SCOPES[classScope].label : null,
        transportRouteName,
        applicableClassIds: classScope ? classIdsByScope[classScope] || [] : appliesToAllClasses ? activeClasses.map((item) => item.id) : [row.classId],
        description: removeFeeScopeMarkers(row.description),
        class: transportRouteName
          ? { id: `ROUTE_${transportRouteName}`, name: transportRouteName, stream: null }
          : appliesToAllClasses
          ? { id: 'ALL', name: 'All Classes', stream: null }
          : classScope
            ? { id: `SCOPE_${classScope}`, name: FEE_CLASS_SCOPES[classScope].label, stream: null }
          : row.class,
      }
    })
      .filter((row) =>
        !classId ||
        row.appliesToAllClasses ||
        (!requestedFilterScope && row.classId === classId) ||
        Boolean(row.classScope && row.classScope === selectedClassScope)
      )

    return NextResponse.json({ success: true, data: normalized })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to fetch transport fee structures')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const body = await request.json()
    const { classId, termId, amount, routeName } = body || {}

    if (!termId || !amount || (!classId && !routeName)) {
      return NextResponse.json(
        { success: false, error: 'termId, amount, and routeName are required' },
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

    const normalizedRouteName = String(routeName || '').trim()
    if (normalizedRouteName) {
      const matchingBus = isTransportFeeGroup(normalizedRouteName)
        ? { routeName: normalizedRouteName }
        : await db.schoolBus.findFirst({
            where: { routeName: { equals: normalizedRouteName, mode: 'insensitive' } },
            select: { routeName: true },
          })
      if (!matchingBus) {
        return NextResponse.json(
          { success: false, error: 'Select an existing transport route or Kapsoya transport group' },
          { status: 400 }
        )
      }

      const activeClass = await db.schoolClass.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
        orderBy: [{ name: 'asc' }],
      })
      if (!activeClass) {
        return NextResponse.json(
          { success: false, error: 'No active classes found' },
          { status: 400 }
        )
      }

      const name = `Transport Fee - ${matchingBus.routeName} - ${termItem.name}`
      const termTransportStructures = await db.feeStructure.findMany({
        where: { termId, category: 'TRANSPORT' },
        select: { id: true, amount: true, description: true },
      })
      const existingRoute = termTransportStructures.find(
        (row) => String(getTransportRouteFromDescription(row.description) || '').trim().toLowerCase() === matchingBus.routeName.trim().toLowerCase()
      )

      if (existingRoute) {
        const paymentsCount = await db.feeTransaction.count({
          where: {
            feeStructureId: existingRoute.id,
            status: { in: ['COMPLETED', 'PENDING'] },
          },
        })
        if (paymentsCount > 0 && Number(existingRoute.amount) !== amountNumber) {
          return NextResponse.json(
            {
              success: false,
              error: 'This route transport fee is locked because payments already exist. Create a new term structure instead.',
            },
            { status: 409 }
          )
        }

        const updated = await db.feeStructure.update({
          where: { id: existingRoute.id },
          data: {
            amount: amountNumber,
            name,
            classId: activeClass.id,
            status: 'ACTIVE',
            description: addTransportRouteMarker(matchingBus.routeName, `Transport fee for ${matchingBus.routeName}`),
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
            transportRouteName: matchingBus.routeName,
            class: { id: `ROUTE_${matchingBus.routeName}`, name: matchingBus.routeName, stream: null },
            description: removeFeeScopeMarkers(updated.description),
          },
        })
      }

      const created = await db.feeStructure.create({
        data: {
          classId: activeClass.id,
          termId,
          amount: amountNumber,
          category: 'TRANSPORT',
          name,
          description: addTransportRouteMarker(matchingBus.routeName, `Transport fee for ${matchingBus.routeName}`),
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
          transportRouteName: matchingBus.routeName,
          class: { id: `ROUTE_${matchingBus.routeName}`, name: matchingBus.routeName, stream: null },
          description: removeFeeScopeMarkers(created.description),
        },
      })
    }

    const isAllClasses = String(classId) === 'ALL'
    const requestedScopeValue = String(classId || '').startsWith('SCOPE_')
      ? String(classId).replace('SCOPE_', '')
      : null
    const requestedScope = requestedScopeValue && requestedScopeValue in FEE_CLASS_SCOPES
      ? requestedScopeValue as FeeClassScope
      : null

    if (requestedScope && requestedScope !== 'ECDE' && requestedScope !== 'REST_OF_SCHOOL') {
      return NextResponse.json(
        { success: false, error: 'Invalid transport fee group' },
        { status: 400 }
      )
    }

    if (requestedScope) {
      const activeClasses = await db.schoolClass.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, level: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      })
      const scopedClasses = activeClasses.filter((cls) => getTransportFeeScopeForClass(cls) === requestedScope)
      if (scopedClasses.length === 0) {
        return NextResponse.json(
          { success: false, error: `No active classes found for ${FEE_CLASS_SCOPES[requestedScope].label}` },
          { status: 400 }
        )
      }

      const termTransportStructures = await db.feeStructure.findMany({
        where: { termId, category: 'TRANSPORT' },
        select: { id: true, classId: true, amount: true, description: true, status: true },
      })
      const existingScoped = termTransportStructures.find((row) => getClassScopeFromDescription(row.description) === requestedScope)
      const conflictingRows = termTransportStructures.filter((row) =>
        row.status === 'ACTIVE' &&
        (
          isAllClassesScopeDescription(row.description) ||
          scopedClasses.some((cls) => cls.id === row.classId)
        ) &&
        getClassScopeFromDescription(row.description) !== requestedScope
      )

      if (!existingScoped && conflictingRows.length > 0) {
        const paymentsCount = await db.feeTransaction.count({
          where: {
            feeStructureId: { in: conflictingRows.map((row) => row.id) },
            status: { in: ['COMPLETED', 'PENDING'] },
          },
        })
        if (paymentsCount > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot create ${FEE_CLASS_SCOPES[requestedScope].label} transport structure because existing transport payments already use overlapping structures for this term.`,
            },
            { status: 409 }
          )
        }

        await db.feeStructure.updateMany({
          where: { id: { in: conflictingRows.map((row) => row.id) } },
          data: { status: 'INACTIVE' },
        })
      }

      if (existingScoped) {
        const paymentsCount = await db.feeTransaction.count({
          where: {
            feeStructureId: existingScoped.id,
            status: { in: ['COMPLETED', 'PENDING'] },
          },
        })
        if (paymentsCount > 0 && Number(existingScoped.amount) !== amountNumber) {
          return NextResponse.json(
            {
              success: false,
              error: `This ${FEE_CLASS_SCOPES[requestedScope].label} transport structure is locked because payments already exist. Create a new term structure instead.`,
            },
            { status: 409 }
          )
        }

        const updated = await db.feeStructure.update({
          where: { id: existingScoped.id },
          data: {
            amount: amountNumber,
            name,
            status: 'ACTIVE',
            description: addClassScopeMarker(requestedScope, `Transport fee applied to ${FEE_CLASS_SCOPES[requestedScope].description}`),
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
            classScope: requestedScope,
            classScopeLabel: FEE_CLASS_SCOPES[requestedScope].label,
            applicableClassIds: scopedClasses.map((cls) => cls.id),
            class: { id: `SCOPE_${requestedScope}`, name: FEE_CLASS_SCOPES[requestedScope].label, stream: null },
            description: removeFeeScopeMarkers(updated.description),
          },
        })
      }

      const created = await db.feeStructure.create({
        data: {
          classId: scopedClasses[0].id,
          termId,
          amount: amountNumber,
          category: 'TRANSPORT',
          name,
          description: addClassScopeMarker(requestedScope, `Transport fee applied to ${FEE_CLASS_SCOPES[requestedScope].description}`),
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
          classScope: requestedScope,
          classScopeLabel: FEE_CLASS_SCOPES[requestedScope].label,
          applicableClassIds: scopedClasses.map((cls) => cls.id),
          class: { id: `SCOPE_${requestedScope}`, name: FEE_CLASS_SCOPES[requestedScope].label, stream: null },
          description: removeFeeScopeMarkers(created.description),
        },
      })
    }

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
            description: removeFeeScopeMarkers(updated.description),
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
          description: removeFeeScopeMarkers(created.description),
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
