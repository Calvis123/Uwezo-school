import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES, ALL_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ALL_ROLES] })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const requestedFolder = searchParams.get('folder') || 'inbox' // inbox, sent
    const isParent = authed.role === 'PARENT'
    const folder = isParent ? 'inbox' : requestedFolder

    const effectiveUserId = isParent ? authed.id : (userId || authed.id)

    if (effectiveUserId !== authed.id && !ADMIN_ROLES.includes(authed.role as any)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const where = folder === 'sent'
      ? { senderId: effectiveUserId }
      : { receiverId: effectiveUserId }

    const messages = await db.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Count unread messages
    const unreadCount = await db.message.count({
      where: { receiverId: effectiveUserId, isRead: false },
    })

    return NextResponse.json({
      success: true,
      data: {
        messages,
        unreadCount,
      },
    })
  } catch (error: unknown) {
    console.error('Messages list error:', error)
    return apiRouteError(error, 'Failed to load messages')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ALL_ROLES] })
    if (authed.role === 'PARENT') {
      return NextResponse.json(
        { success: false, error: 'Parents are view-only in messaging' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { receiverId, subject, content } = body

    if (!receiverId || !subject || !content) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 })
    }

    const senderId = authed.id

    if (senderId === receiverId) {
      return NextResponse.json({ success: false, error: 'Cannot send message to yourself' }, { status: 400 })
    }

    // Verify sender exists
    const sender = await db.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true },
    })
    if (!sender) {
      return NextResponse.json({ success: false, error: 'Sender not found' }, { status: 404 })
    }

    // Verify receiver exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true },
    })
    if (!receiver) {
      return NextResponse.json({ success: false, error: 'Receiver not found' }, { status: 404 })
    }

    const message = await db.message.create({
      data: {
        senderId,
        receiverId,
        subject,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: message,
    })
  } catch (error: unknown) {
    console.error('Message create error:', error)
    return apiRouteError(error, 'Failed to send message')
  }
}
