import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = await db.calendarEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: event })
  } catch (error: any) {
    console.error('Error fetching calendar event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar event' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const event = await db.calendarEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    const updatedEvent = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.startDate !== undefined ? { startDate: new Date(body.startDate) } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.startTime !== undefined ? { startTime: body.startTime || null } : {}),
        ...(body.endTime !== undefined ? { endTime: body.endTime || null } : {}),
        ...(body.location !== undefined ? { location: body.location || null } : {}),
        ...(body.eventType !== undefined ? { eventType: body.eventType } : {}),
        ...(body.targetRoles !== undefined ? { targetRoles: body.targetRoles } : {}),
        ...(body.isAllDay !== undefined ? { isAllDay: body.isAllDay } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updatedEvent })
  } catch (error: any) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update calendar event' },
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
    const event = await db.calendarEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    await db.calendarEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Event deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete calendar event' },
      { status: 500 }
    )
  }
}
