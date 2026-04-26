import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentIds, fromClassId, toClassId, academicYear, term, notes } = body

    const authed = await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER'] })

    if (!studentIds?.length || !fromClassId || !toClassId || !academicYear || !term) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (fromClassId === toClassId) {
      return NextResponse.json(
        { success: false, error: 'Source and target class must be different' },
        { status: 400 }
      )
    }

    // Validate classes exist
    const [fromClass, toClass] = await Promise.all([
      db.schoolClass.findUnique({ where: { id: fromClassId } }),
      db.schoolClass.findUnique({ where: { id: toClassId } }),
    ])

    if (!fromClass || !toClass) {
      return NextResponse.json(
        { success: false, error: 'One or both classes not found' },
        { status: 404 }
      )
    }

    // Validate students are in the source class
    const students = await db.student.findMany({
      where: {
        id: { in: studentIds },
        classId: fromClassId,
        status: 'ACTIVE',
      },
    })

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active students found in the source class' },
        { status: 400 }
      )
    }

    const validStudentIds = students.map(s => s.id)
    const skippedIds = studentIds.filter(id => !validStudentIds.includes(id))

    // Create promotion records and update student class assignments
    await db.$transaction(async (tx) => {
      // Create promotion records
      await tx.promotionRecord.createMany({
        data: validStudentIds.map(studentId => ({
          studentId,
          fromClassId,
          toClassId,
          academicYear,
          term,
          status: 'COMPLETED',
          promotedBy: authed.id,
          notes: notes || '',
          completedAt: new Date(),
        })),
      })

      // Update students' class
      await tx.student.updateMany({
        where: { id: { in: validStudentIds } },
        data: { classId: toClassId },
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        promoted: validStudentIds.length,
        skipped: skippedIds.length,
        fromClass: fromClass.name,
        toClass: toClass.name,
      },
    })
  } catch (error: unknown) {
    console.error('Promotion error:', error)
    return apiRouteError(error, 'Failed to process promotion')
  }
}
