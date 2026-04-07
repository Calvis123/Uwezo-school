import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const folder = searchParams.get('folder') || 'inbox' // inbox, sent

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    const where = folder === 'sent'
      ? { senderId: userId }
      : { receiverId: userId }

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
      where: { receiverId: userId, isRead: false },
    })

    return NextResponse.json({
      success: true,
      data: {
        messages,
        unreadCount,
      },
    })
  } catch (error: any) {
    console.error('Messages list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load messages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { senderId, receiverId, subject, content } = body

    if (!senderId || !receiverId || !subject || !content) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 })
    }

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
  } catch (error: any) {
    console.error('Message create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 })
  }
}
