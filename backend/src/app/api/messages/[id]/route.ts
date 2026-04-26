import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES, ALL_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await requireUser(request, { roles: [...ALL_ROLES] })
    if (authed.role === 'PARENT') {
      return NextResponse.json(
        { success: false, error: 'Parents are view-only in messaging' },
        { status: 403 }
      )
    }
    const { id } = await params

    const message = await db.message.findUnique({
      where: { id },
      select: { id: true, senderId: true, receiverId: true },
    })

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
    }

    const isOwner = message.senderId === authed.id || message.receiverId === authed.id
    const isAdmin = ADMIN_ROLES.includes(authed.role as any)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    await db.message.delete({ where: { id: message.id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete message error:', error)
    return apiRouteError(error, 'Failed to delete message')
  }
}
