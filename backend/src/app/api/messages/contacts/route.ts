import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ALL_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ALL_ROLES] })
    if (authed.role === 'PARENT') {
      return NextResponse.json(
        { success: false, error: 'Parents are not allowed to load message contacts' },
        { status: 403 }
      )
    }
    const { searchParams } = new URL(request.url)
    const audience = searchParams.get('audience') || 'ALL_USERS'
    const classId = searchParams.get('classId') || ''

    let users: Array<{ id: string; name: string; email: string; role: string; phone: string | null }> = []

    if (audience === 'ALL_PARENTS') {
      users = await db.user.findMany({
        where: {
          status: 'ACTIVE',
          role: 'PARENT',
          id: { not: authed.id },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
        take: 500,
      })
    } else if (audience === 'PARENTS_BY_CLASS') {
      if (!classId) {
        return NextResponse.json(
          { success: false, error: '`classId` is required for PARENTS_BY_CLASS audience' },
          { status: 400 }
        )
      }

      const guardians = await db.studentGuardian.findMany({
        where: {
          student: { classId },
          guardian: {
            status: 'ACTIVE',
            role: 'PARENT',
            id: { not: authed.id },
          },
        },
        select: {
          guardian: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              phone: true,
            },
          },
        },
        take: 1000,
      })

      const uniq = new Map<string, { id: string; name: string; email: string; role: string; phone: string | null }>()
      for (const row of guardians) {
        uniq.set(row.guardian.id, row.guardian)
      }
      users = Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name))
    } else {
      users = await db.user.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: authed.id },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
        take: 500,
      })
    }

    return NextResponse.json({ success: true, data: users })
  } catch (error: unknown) {
    console.error('Messages contacts error:', error)
    return apiRouteError(error, 'Failed to load message contacts')
  }
}
