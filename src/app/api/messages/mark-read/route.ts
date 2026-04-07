import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messageIds } = body

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'messageIds array is required' }, { status: 400 })
    }

    await db.message.updateMany({
      where: { id: { in: messageIds } },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark read error:', error)
    return NextResponse.json({ success: false, error: 'Failed to mark messages as read' }, { status: 500 })
  }
}
