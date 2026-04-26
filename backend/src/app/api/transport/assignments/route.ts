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

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, ...OFFICE_ROLES] })

    const { searchParams } = new URL(request.url)
    const busId = searchParams.get('busId') || undefined
    let termId = searchParams.get('termId') || ''

    if (!termId) {
      const activeTerm = await db.term.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } })
      termId = activeTerm?.id || ''
    }

    if (!termId) {
      return NextResponse.json({ success: true, data: [], meta: { termId: null } })
    }

    const assignments = await db.transportAssignment.findMany({
      where: {
        termId,
        status: 'ACTIVE',
        ...(busId ? { busId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { id: true, name: true, stream: true } },
          },
        },
        bus: { select: { id: true, busNumber: true, routeName: true } },
        term: { select: { id: true, name: true, year: true } },
      },
      orderBy: [{ bus: { busNumber: 'asc' } }, { student: { lastName: 'asc' } }],
    })

    return NextResponse.json({
      success: true,
      data: assignments,
      meta: { termId },
    })
  } catch (error: unknown) {
    console.error('Transport assignments list error:', error)
    return apiRouteError(error, 'Failed to fetch transport assignments')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...ADMIN_ROLES, ...OFFICE_ROLES] })
    const body = await request.json()
    const { studentId, busId, termId } = body

    if (!studentId || !busId) {
      return NextResponse.json({ success: false, error: 'studentId and busId are required' }, { status: 400 })
    }

    let resolvedTermId = termId
    if (!resolvedTermId) {
      const activeTerm = await db.term.findFirst({ where: { status: 'ACTIVE' }, select: { id: true } })
      resolvedTermId = activeTerm?.id
    }
    if (!resolvedTermId) {
      return NextResponse.json({ success: false, error: 'No active term found' }, { status: 400 })
    }

    const [student, bus] = await Promise.all([
      db.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true, status: true, studentType: true, usesTransport: true },
      }),
      db.schoolBus.findUnique({ where: { id: busId }, select: { id: true, capacity: true, status: true } }),
    ])

    if (!student || student.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Student not found or inactive' }, { status: 404 })
    }
    if (student.studentType !== 'DAY' || !student.usesTransport) {
      return NextResponse.json(
        { success: false, error: 'Only day scholars marked as transport users can be assigned to a bus' },
        { status: 400 }
      )
    }
    if (!bus || bus.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Bus not found or inactive' }, { status: 404 })
    }

    const paidTransport = await db.feeTransaction.aggregate({
      where: {
        studentId,
        status: 'COMPLETED',
        feeStructure: { category: 'TRANSPORT', termId: resolvedTermId },
      },
      _sum: { amount: true },
    })
    const paidAmount = paidTransport._sum.amount || 0
    if (paidAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Student has not paid transport fee for this term' },
        { status: 400 }
      )
    }

    const activeAssignmentsOnBus = await db.transportAssignment.count({
      where: { busId, termId: resolvedTermId, status: 'ACTIVE' },
    })

    const existing = await db.transportAssignment.findUnique({
      where: { studentId_termId: { studentId, termId: resolvedTermId } },
      select: { id: true, busId: true, status: true },
    })

    const effectiveLoad = existing && existing.busId === busId && existing.status === 'ACTIVE'
      ? activeAssignmentsOnBus
      : activeAssignmentsOnBus + 1

    if (effectiveLoad > bus.capacity) {
      return NextResponse.json({ success: false, error: 'Bus capacity exceeded' }, { status: 409 })
    }

    const assignment = await db.transportAssignment.upsert({
      where: { studentId_termId: { studentId, termId: resolvedTermId } },
      create: {
        studentId,
        classId: student.classId,
        busId,
        termId: resolvedTermId,
        paidAmount,
        status: 'ACTIVE',
        assignedBy: authed.id,
      },
      update: {
        classId: student.classId,
        busId,
        paidAmount,
        status: 'ACTIVE',
        assignedBy: authed.id,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
        bus: { select: { id: true, busNumber: true, routeName: true } },
      },
    })

    await refreshBusOccupancy(resolvedTermId)

    return NextResponse.json({ success: true, data: assignment })
  } catch (error: unknown) {
    console.error('Transport assignment create error:', error)
    return apiRouteError(error, 'Failed to assign student to bus')
  }
}
