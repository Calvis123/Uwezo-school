import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import {
  FEE_CLASS_SCOPES,
  getClassScopeFromDescription,
  isAllClassesScopeDescription,
  removeFeeScopeMarkers,
} from '@/lib/fee-structure-scope'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })
    const { id } = await params
    const body = await request.json()
    const { amount, status } = body || {}

    const existing = await db.feeStructure.findUnique({ where: { id } })
    if (!existing || existing.category !== 'TRANSPORT') {
      return NextResponse.json(
        { success: false, error: 'Transport fee structure not found' },
        { status: 404 }
      )
    }

    const amountNumber = amount !== undefined ? Number(amount) : undefined
    if (amount !== undefined && (!Number.isFinite(amountNumber) || Number(amountNumber) <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }
    if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const paymentsCount = await db.feeTransaction.count({
      where: {
        feeStructureId: id,
        status: { in: ['COMPLETED', 'PENDING'] },
      },
    })
    if (paymentsCount > 0) {
      if (amount !== undefined && Number(existing.amount) !== Number(amountNumber)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot change amount. This fee structure is locked because payments already exist.',
          },
          { status: 409 }
        )
      }
      if (status !== undefined && String(status).toUpperCase() !== String(existing.status).toUpperCase()) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot change status. This fee structure is locked because payments already exist.',
          },
          { status: 409 }
        )
      }
    }

    const updated = await db.feeStructure.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: Number(amountNumber) } : {}),
        ...(status ? { status: String(status).toUpperCase() } : {}),
      },
      include: {
        class: { select: { id: true, name: true, stream: true } },
        term: { select: { id: true, name: true, year: true, status: true } },
      },
    })

    const appliesToAllClasses = isAllClassesScopeDescription(updated.description)
    const classScope = getClassScopeFromDescription(updated.description)
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        appliesToAllClasses,
        classScope,
        classScopeLabel: classScope ? FEE_CLASS_SCOPES[classScope].label : null,
        description: removeFeeScopeMarkers(updated.description),
        class: appliesToAllClasses
          ? { id: 'ALL', name: 'All Classes', stream: null }
          : classScope
            ? { id: `SCOPE_${classScope}`, name: FEE_CLASS_SCOPES[classScope].label, stream: null }
          : updated.class,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to update transport fee structure')
  }
}
