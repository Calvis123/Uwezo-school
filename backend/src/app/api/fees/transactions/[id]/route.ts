import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })
    const { id } = await params
    const body = await request.json()

    const existing = await db.feeTransaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 })
    }

    const payload: {
      amount?: number
      paymentMethod?: string
      status?: string
      notes?: string | null
      transactionRef?: string | null
    } = {}

    if (body.amount !== undefined) payload.amount = Number(body.amount)
    if (body.paymentMethod !== undefined) payload.paymentMethod = String(body.paymentMethod)
    if (body.status !== undefined) payload.status = String(body.status)
    if (body.notes !== undefined) payload.notes = body.notes ? String(body.notes) : null
    if (body.transactionRef !== undefined) payload.transactionRef = body.transactionRef ? String(body.transactionRef) : null

    const updated = await db.feeTransaction.update({
      where: { id },
      data: payload,
      include: {
        student: {
          include: { class: true },
        },
        feeStructure: {
          include: { term: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to update payment transaction')
  }
}

