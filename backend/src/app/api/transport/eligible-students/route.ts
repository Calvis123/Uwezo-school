import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { OFFICE_ROLES, FINANCE_ROLES, ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, {
      roles: [...ADMIN_ROLES, ...OFFICE_ROLES, ...FINANCE_ROLES],
    })

    const { searchParams } = new URL(request.url)
    let termId = searchParams.get('termId') || ''

    if (!termId) {
      const activeTerm = await db.term.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
      })
      termId = activeTerm?.id || ''
    }

    if (!termId) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { termId: null },
      })
    }

    const transportPayments = await db.feeTransaction.findMany({
      where: {
        status: 'COMPLETED',
        feeStructure: {
          category: 'TRANSPORT',
          termId,
        },
      },
      select: {
        studentId: true,
        amount: true,
        createdAt: true,
      },
    })

    const paidByStudent = transportPayments.reduce<Record<string, number>>((acc, row) => {
      acc[row.studentId] = (acc[row.studentId] || 0) + row.amount
      return acc
    }, {})

    const studentIds = Object.keys(paidByStudent)
    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { termId },
      })
    }

    const [students, assignments] = await Promise.all([
      db.student.findMany({
        where: {
          id: { in: studentIds },
          status: 'ACTIVE',
          studentType: 'DAY',
          usesTransport: true,
        },
        include: {
          class: {
            select: { id: true, name: true, stream: true },
          },
        },
        orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
      }),
      db.transportAssignment.findMany({
        where: { termId, status: 'ACTIVE' },
        select: {
          studentId: true,
          busId: true,
          transportMode: true,
          bus: { select: { id: true, busNumber: true, routeName: true } },
        },
      }),
    ])

    const assignedMap = assignments.reduce<Record<string, { busId: string; busNumber: string; routeName: string; transportMode: string }>>((acc, row) => {
      acc[row.studentId] = {
        busId: row.busId,
        busNumber: row.bus.busNumber,
        routeName: row.bus.routeName,
        transportMode: row.transportMode,
      }
      return acc
    }, {})

    const data = students.map((student) => ({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      class: student.class,
      paidTransport: paidByStudent[student.id] || 0,
      assigned: assignedMap[student.id] || null,
    }))

    return NextResponse.json({
      success: true,
      data,
      meta: { termId },
    })
  } catch (error: unknown) {
    console.error('Transport eligible students error:', error)
    return apiRouteError(error, 'Failed to fetch eligible transport students')
  }
}
