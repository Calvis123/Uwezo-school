import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// GET /api/health/conditions/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { id } = await params
    const condition = await db.healthCondition.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true, class: { select: { name: true } } },
        },
      },
    })

    if (!condition) {
      return NextResponse.json({ success: false, error: 'Condition not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: condition })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}

// PUT /api/health/conditions/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { id } = await params
    const body = await request.json()

    const condition = await db.healthCondition.update({
      where: { id },
      data: {
        ...(body.condition && { condition: body.condition }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.severity && { severity: body.severity }),
        ...(body.isChronic !== undefined && { isChronic: body.isChronic }),
        ...(body.diagnosedDate !== undefined && {
          diagnosedDate: body.diagnosedDate ? new Date(body.diagnosedDate) : null,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    })

    return NextResponse.json({ success: true, data: condition })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}

// DELETE /api/health/conditions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { id } = await params
    await db.healthCondition.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
