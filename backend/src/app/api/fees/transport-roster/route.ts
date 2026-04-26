import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { isAllClassesScopeDescription } from '@/lib/fee-structure-scope'

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId') || undefined
    let termId = searchParams.get('termId') || ''

    if (!termId) {
      const fallbackTerm = await db.term.findFirst({
        where: {},
        select: { id: true },
        orderBy: [{ status: 'asc' }, { year: 'desc' }, { startDate: 'desc' }],
      })
      termId = fallbackTerm?.id || ''
    }

    if (!termId) {
      return NextResponse.json({
        success: true,
        data: { term: null, summary: null, students: [] },
      })
    }

    const term = await db.term.findUnique({
      where: { id: termId },
      select: { id: true, name: true, year: true },
    })

    const classes = await db.schoolClass.findMany({
      where: {
        status: 'ACTIVE',
        ...(classId ? { id: classId } : {}),
      },
      select: { id: true, name: true, stream: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    if (classes.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          term,
          summary: {
            expectedTotal: 0,
            paidTotal: 0,
            balanceTotal: 0,
            paidStudents: 0,
            partialStudents: 0,
            unpaidStudents: 0,
          },
          students: [],
        },
      })
    }

    const classIds = classes.map((row) => row.id)

    const transportStructures = await db.feeStructure.findMany({
      where: {
        termId,
        category: 'TRANSPORT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        amount: true,
        classId: true,
        description: true,
      },
    })

    const globalStructureRows = transportStructures.filter((row) => isAllClassesScopeDescription(row.description))
    const classSpecificRows = transportStructures.filter((row) => !isAllClassesScopeDescription(row.description))

    const globalDue = globalStructureRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const dueByClassId = classSpecificRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.classId] = (acc[row.classId] || 0) + Number(row.amount || 0)
      return acc
    }, {})

    const transportStructureIds = transportStructures.map((row) => row.id)
    const rosterClassIds =
      globalDue > 0 || Object.keys(dueByClassId).length === 0
        ? classIds
        : Object.keys(dueByClassId)

    const students = await db.student.findMany({
      where: {
        status: 'ACTIVE',
        studentType: 'DAY',
        usesTransport: true,
        classId: { in: rosterClassIds },
      },
      include: {
        class: {
          select: { id: true, name: true, stream: true },
        },
      },
      orderBy: [{ class: { name: 'asc' } }, { lastName: 'asc' }, { firstName: 'asc' }],
    })

    if (students.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          term,
          summary: {
            expectedTotal: 0,
            paidTotal: 0,
            balanceTotal: 0,
            paidStudents: 0,
            partialStudents: 0,
            unpaidStudents: 0,
          },
          students: [],
        },
      })
    }

    const studentIds = students.map((row) => row.id)

    const transportTransactions = transportStructureIds.length
      ? await db.feeTransaction.findMany({
      where: {
        status: 'COMPLETED',
        studentId: { in: studentIds },
        feeStructureId: { in: transportStructureIds },
      },
      select: {
        studentId: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        receiptNumber: true,
      },
      orderBy: { createdAt: 'desc' },
      })
      : []

    const paidByStudent: Record<string, number> = {}
    const lastPaymentByStudent: Record<
      string,
      { amount: number; paymentMethod: string; createdAt: Date; receiptNumber: string }
    > = {}
    const paymentCountByStudent: Record<string, number> = {}

    for (const tx of transportTransactions) {
      paidByStudent[tx.studentId] = (paidByStudent[tx.studentId] || 0) + Number(tx.amount || 0)
      paymentCountByStudent[tx.studentId] = (paymentCountByStudent[tx.studentId] || 0) + 1
      if (!lastPaymentByStudent[tx.studentId]) {
        lastPaymentByStudent[tx.studentId] = {
          amount: Number(tx.amount || 0),
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          receiptNumber: tx.receiptNumber,
        }
      }
    }

    let expectedTotal = 0
    let paidTotal = 0
    let balanceTotal = 0
    let paidStudents = 0
    let partialStudents = 0
    let unpaidStudents = 0

    const studentsPayload = students.map((student) => {
      const classSpecificExpected = Number(dueByClassId[student.classId] || 0)
      const expected = classSpecificExpected > 0 ? classSpecificExpected : Number(globalDue || 0)
      const paid = Number(paidByStudent[student.id] || 0)
      const balance = Math.max(0, expected - paid)
      const lastPayment = lastPaymentByStudent[student.id] || null

      let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID'
      if (expected > 0 && paid >= expected) paymentStatus = 'PAID'
      else if (paid > 0) paymentStatus = 'PARTIAL'

      if (paymentStatus === 'PAID') paidStudents += 1
      else if (paymentStatus === 'PARTIAL') partialStudents += 1
      else unpaidStudents += 1

      expectedTotal += expected
      paidTotal += paid
      balanceTotal += balance

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        class: {
          id: student.class.id,
          name: student.class.name,
          stream: student.class.stream,
        },
        transportFee: {
          expected,
          paid,
          balance,
          paymentStatus,
          paymentCount: paymentCountByStudent[student.id] || 0,
          lastPaymentAt: lastPayment?.createdAt || null,
          lastPaymentMethod: lastPayment?.paymentMethod || null,
          lastPaymentAmount: lastPayment?.amount || 0,
          lastReceiptNumber: lastPayment?.receiptNumber || null,
          suggestedFeeStructureId:
            classSpecificRows.find((row) => row.classId === student.classId)?.id ||
            globalStructureRows[0]?.id ||
            null,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        term,
        summary: {
          expectedTotal,
          paidTotal,
          balanceTotal,
          paidStudents,
          partialStudents,
          unpaidStudents,
        },
        students: studentsPayload,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to fetch transport fee roster')
  }
}
