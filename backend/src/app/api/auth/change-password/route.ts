import { NextRequest, NextResponse } from 'next/server'
import { compareSync, hashSync } from 'bcryptjs'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)

    const body = await request.json().catch(() => null)
    const currentPassword = String(body?.currentPassword || '')
    const newPassword = String(body?.newPassword || '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!compareSync(currentPassword, existing.password)) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: hashSync(newPassword, 10) },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to change password')
  }
}

