import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { ALL_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ALL_ROLES] })

    const body = await request.json()
    const { messageIds } = body

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'messageIds array is required' }, { status: 400 })
    }

    await db.message.updateMany({
      where: { id: { in: messageIds }, receiverId: authed.id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Mark read error:', error)
    return apiRouteError(error, 'Failed to mark messages as read')
  }
}
