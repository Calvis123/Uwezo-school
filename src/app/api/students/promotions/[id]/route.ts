import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (status === 'APPROVED') {
      updateData.status = 'APPROVED'
    } else if (status === 'COMPLETED') {
      updateData.status = 'COMPLETED'
      updateData.completedAt = new Date()
      // Also update the student's class
      await db.student.update({
        where: { id: promotion.studentId },
        data: { classId: promotion.toClassId },
      })
    }

    const updated = await db.promotionRecord.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Update promotion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update promotion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // If completed, revert student back to original class
    if (promotion.status === 'COMPLETED') {
      await db.student.update({
        where: { id: promotion.studentId },
        data: { classId: promotion.fromClassId },
      })
    }

    await db.promotionRecord.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { message: 'Promotion cancelled' } })
  } catch (error: any) {
    console.error('Delete promotion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel promotion' },
      { status: 500 }
    )
  }
}
