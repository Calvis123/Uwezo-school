import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/health/records/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await db.healthRecord.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true, gender: true, class: { select: { name: true } } },
        },
      },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/health/records/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const record = await db.healthRecord.update({
      where: { id },
      data: {
        ...(body.recordType && { recordType: body.recordType }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.date && { date: new Date(body.date) }),
        ...(body.severity && { severity: body.severity }),
        ...(body.status && { status: body.status }),
        ...(body.treatedBy !== undefined && { treatedBy: body.treatedBy }),
        ...(body.attachments !== undefined && { attachments: body.attachments }),
        ...(body.followUpDate !== undefined && {
          followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        }),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/health/records/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.healthRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
