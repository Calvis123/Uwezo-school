import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] })

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

    const allowedTargets = authed.role === 'TEACHER'
      ? ['ALL', 'STAFF', 'TEACHERS']
      : ['ALL', 'STAFF']
    if (!allowedTargets.includes(event.targetRoles)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: event is not visible to your role' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: event })
  } catch (error: unknown) {
    console.error('Error fetching calendar event:', error)
    return apiRouteError(error, 'Failed to fetch calendar event')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

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
  } catch (error: unknown) {
    console.error('Error updating calendar event:', error)
    return apiRouteError(error, 'Failed to update calendar event')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

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
  } catch (error: unknown) {
    console.error('Error deleting calendar event:', error)
    return apiRouteError(error, 'Failed to delete calendar event')
  }
}
