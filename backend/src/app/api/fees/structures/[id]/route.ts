import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { SUPER_ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { getSettingsActiveTerm } from '@/lib/active-term'
import {
  addAllClassesScopeMarker,
  addClassScopeMarker,
  getClassScopeFromDescription,
  isAllClassesScopeDescription,
  removeFeeScopeMarkers,
} from '@/lib/fee-structure-scope'

const ALLOWED_CATEGORIES = ['TUITION', 'BOARDING', 'EXTRACURRICULAR', 'OTHER']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...SUPER_ADMIN_ROLES] })
    const { id } = await params
    const body = await request.json()
    const { name, classId, termId, amount, category, description, status } = body || {}

    const existing = await db.feeStructure.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Fee structure not found' },
        { status: 404 }
      )
    }
    if (existing.category === 'TRANSPORT') {
      return NextResponse.json(
        { success: false, error: 'Transport fee structures are managed in the Transport module' },
        { status: 400 }
      )
    }

    const normalizedName = name !== undefined ? String(name || '').trim() : undefined
    if (normalizedName !== undefined && normalizedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const amountNumber = amount !== undefined ? Number(amount) : undefined
    if (amount !== undefined && (!Number.isFinite(amountNumber) || Number(amountNumber) <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    const categoryValue = category !== undefined ? String(category || '').toUpperCase() : undefined
    if (categoryValue !== undefined && !ALLOWED_CATEGORIES.includes(categoryValue)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fee category' },
        { status: 400 }
      )
    }

    const statusValue = status !== undefined ? String(status || '').toUpperCase() : undefined
    if (statusValue !== undefined && !['ACTIVE', 'INACTIVE'].includes(statusValue)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const hasPayments = Number(existing._count.transactions || 0) > 0
    if (hasPayments) {
      const protectedChange =
        (amount !== undefined && Number(existing.amount) !== Number(amountNumber)) ||
        (categoryValue !== undefined && categoryValue !== existing.category) ||
        (classId !== undefined && classId !== existing.classId) ||
        (termId !== undefined && termId !== existing.termId) ||
        (statusValue !== undefined && statusValue !== existing.status)

      if (protectedChange) {
        return NextResponse.json(
          {
            success: false,
            error: 'This fee structure is locked because payments already exist. You can only update the name or description.',
          },
          { status: 409 }
        )
      }
    }

    if (classId !== undefined && classId !== existing.classId && !String(classId).startsWith('SCOPE_')) {
      const classExists = await db.schoolClass.findUnique({ where: { id: classId }, select: { id: true } })
      if (!classExists) {
        return NextResponse.json(
          { success: false, error: 'Invalid class selected' },
          { status: 400 }
        )
      }
    }

    const targetTermId = termId !== undefined ? termId : existing.termId
    const targetTerm = await db.term.findUnique({ where: { id: targetTermId }, select: { id: true, status: true } })
    if (!targetTerm) {
      return NextResponse.json(
        { success: false, error: 'Invalid term selected' },
        { status: 400 }
      )
    }
    const settingsActiveTerm = await getSettingsActiveTerm()

    if (termId !== undefined && termId !== existing.termId) {
      const termExists = targetTerm
      if (!termExists) {
        return NextResponse.json(
          { success: false, error: 'Invalid term selected' },
          { status: 400 }
        )
      }
    }

    const existingScope = getClassScopeFromDescription(existing.description)
    const existingAllClasses = isAllClassesScopeDescription(existing.description)
    const cleanedDescription = description !== undefined
      ? removeFeeScopeMarkers(description)
      : removeFeeScopeMarkers(existing.description)
    const scopedDescription = existingScope
      ? addClassScopeMarker(existingScope, cleanedDescription)
      : existingAllClasses
        ? addAllClassesScopeMarker(cleanedDescription)
        : cleanedDescription || undefined

    const updated = await db.feeStructure.update({
      where: { id },
      data: {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(classId !== undefined && !String(classId).startsWith('SCOPE_') ? { classId } : {}),
        ...(termId !== undefined ? { termId } : {}),
        ...(amount !== undefined ? { amount: Number(amountNumber) } : {}),
        ...(categoryValue !== undefined ? { category: categoryValue } : {}),
        status: targetTerm.id === settingsActiveTerm?.id ? 'ACTIVE' : 'INACTIVE',
        description: scopedDescription,
      },
      include: {
        class: true,
        term: true,
        _count: { select: { transactions: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        classScope: existingScope,
        appliesToAllClasses: existingAllClasses,
        status: updated.termId === settingsActiveTerm?.id ? 'ACTIVE' : 'INACTIVE',
        description: removeFeeScopeMarkers(updated.description),
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to update fee structure')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...SUPER_ADMIN_ROLES] })
    const { id } = await params

    const existing = await db.feeStructure.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Fee structure not found' },
        { status: 404 }
      )
    }

    if (Number(existing._count.transactions || 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete this fee structure because payments already exist.' },
        { status: 409 }
      )
    }

    await db.feeStructure.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to delete fee structure')
  }
}
