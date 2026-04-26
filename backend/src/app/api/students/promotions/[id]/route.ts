import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] })

    const { id } = await params
    const body = await request.json()
    const { status, notes } = body

    const promotion = await db.promotionRecord.findUnique({
      where: { id },
      include: { student: true, fromClass: true, toClass: true },
    })

    if (!promotion) {
      return NextResponse.json(
        { success: false, error: 'Promotion record not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (notes !== undefined) updateData.notes = notes

    const updated = await db.$transaction(async (tx) => {
      if (status === 'APPROVED') {
        updateData.status = 'APPROVED'
      } else if (status === 'COMPLETED') {
        updateData.status = 'COMPLETED'
        updateData.completedAt = new Date()
        await tx.student.update({
          where: { id: promotion.studentId },
          data: { classId: promotion.toClassId },
        })
      }

      return tx.promotionRecord.update({
        where: { id },
        data: updateData,
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Update promotion error:', error)
    return apiRouteError(error, 'Failed to update promotion')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] })

    const { id } = await params

    const promotion = await db.promotionRecord.findUnique({
      where: { id },
      include: { student: true },
    })

    if (!promotion) {
      return NextResponse.json(
        { success: false, error: 'Promotion record not found' },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      // If completed, revert student back to original class
      if (promotion.status === 'COMPLETED') {
        await tx.student.update({
          where: { id: promotion.studentId },
          data: { classId: promotion.fromClassId },
        })
      }

      await tx.promotionRecord.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, data: { message: 'Promotion cancelled' } })
  } catch (error: unknown) {
    console.error('Delete promotion error:', error)
    return apiRouteError(error, 'Failed to cancel promotion')
  }
}
