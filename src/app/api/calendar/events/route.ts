import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

const db = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const eventType = searchParams.get('eventType')

    const where: Prisma.CalendarEventWhereInput = {}

    // Filter by month/year
    if (month && year) {
      const m = parseInt(month)
      const y = parseInt(year)
      const startDate = new Date(y, m - 1, 1)
      const endDate = new Date(y, m, 0, 23, 59, 59)
      where.startDate = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Filter by event type
    if (eventType && eventType !== 'ALL') {
      where.eventType = eventType
    }

    const events = await db.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    })

    // Also fetch upcoming events if no month filter
    let upcomingEvents: any[] = []
    if (!month || !year) {
      upcomingEvents = await db.calendarEvent.findMany({
        where: {
          startDate: {
            gte: new Date(),
          },
        },
        orderBy: { startDate: 'asc' },
        take: 10,
      })
    }

    return NextResponse.json({
      success: true,
      data: events,
      ...(upcomingEvents.length > 0 ? { upcomingEvents } : {}),
    })
  } catch (error: any) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      eventType,
      targetRoles,
      isAllDay,
      color,
    } = body

    if (!title || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Title and start date are required' },
        { status: 400 }
      )
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        eventType: eventType || 'EVENT',
        targetRoles: targetRoles || 'ALL',
        isAllDay: isAllDay ?? false,
        color: color || 'teal',
      },
    })

    return NextResponse.json({ success: true, data: event })
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar event' },
      { status: 500 }
    )
  }
}
