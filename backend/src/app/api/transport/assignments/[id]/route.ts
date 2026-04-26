import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { OFFICE_ROLES, ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

async function refreshBusOccupancy(termId: string) {
  const buses = await db.schoolBus.findMany({ select: { id: true } })
  const counts = await db.transportAssignment.groupBy({
    by: ['busId'],
    where: { termId, status: 'ACTIVE' },
    _count: true,
  })
  const countMap = counts.reduce<Record<string, number>>((acc, item) => {
    acc[item.busId] = item._count
    return acc
  }, {})

  await Promise.all(
    buses.map((bus) =>
      db.schoolBus.update({
        where: { id: bus.id },
        data: { currentStudents: countMap[bus.id] || 0 },
      })
    )
  )
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, ...OFFICE_ROLES] })
    const { id } = await params

    const existing = await db.transportAssignment.findUnique({
      where: { id },
      select: { id: true, termId: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
    }

    await db.transportAssignment.update({
      where: { id },
      data: { status: 'INACTIVE' },
    })

    await refreshBusOccupancy(existing.termId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Transport assignment delete error:', error)
    return apiRouteError(error, 'Failed to remove bus assignment')
  }
}

