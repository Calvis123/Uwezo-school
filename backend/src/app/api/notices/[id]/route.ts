import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'

const NOTICE_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY'] as const

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...NOTICE_MANAGER_ROLES] })
    const { id } = await params
    const body = await request.json().catch(() => null)

    const existing = await db.schoolNotice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Notice not found' }, { status: 404 })
    }

    const nextPublished = body?.isPublished !== undefined ? Boolean(body.isPublished) : existing.isPublished
    const hasPublishStateChange = existing.isPublished !== nextPublished

    const updated = await db.schoolNotice.update({
      where: { id },
      data: {
        ...(body?.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body?.content !== undefined ? { content: String(body.content).trim() } : {}),
        ...(body?.category !== undefined ? { category: String(body.category).trim().toUpperCase() } : {}),
        ...(body?.targetRoles !== undefined ? { targetRoles: String(body.targetRoles).trim().toUpperCase() } : {}),
        ...(body?.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
        ...(body?.isPublished !== undefined ? { isPublished: nextPublished } : {}),
        ...(body?.isPublished !== undefined
          ? { publishedAt: nextPublished ? (hasPublishStateChange ? new Date() : existing.publishedAt || new Date()) : null }
          : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    console.error('Error updating notice:', error)
    return apiRouteError(error, 'Failed to update notice')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...NOTICE_MANAGER_ROLES] })
    const { id } = await params

    const existing = await db.schoolNotice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Notice not found' }, { status: 404 })
    }

    await db.schoolNotice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting notice:', error)
    return apiRouteError(error, 'Failed to delete notice')
  }
}

