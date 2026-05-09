import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { getApplicableFeeStructures } from '@/lib/fee-balance'

type TermLite = {
  id: string
  name: string
  year: number
  startDate?: Date
}

function getPaymentStatus(expected: number, paid: number): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (paid <= 0) return 'UNPAID'
  if (expected > 0 && paid < expected) return 'PARTIAL'
  return 'PAID'
}

function pickCurrentYear(terms: Array<TermLite & { status?: string }>) {
  const activeTerm = terms.find((term) => term.status === 'ACTIVE')
  if (activeTerm) return activeTerm.year
  if (terms.length === 0) return new Date().getFullYear()
  return Math.max(...terms.map((term) => term.year))
}

function sortTerms(a: TermLite, b: TermLite) {
  if (a.year !== b.year) return a.year - b.year
  const aNo = Number((a.name.match(/\d+/)?.[0] || '99'))
  const bNo = Number((b.name.match(/\d+/)?.[0] || '99'))
  return aNo - bNo
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId') || undefined
    const requestedYear = searchParams.get('year')

    const allTerms = await db.term.findMany({
      select: { id: true, name: true, year: true, status: true, startDate: true },
      orderBy: [{ year: 'asc' }, { startDate: 'asc' }],
    })

    const year = requestedYear ? Number(requestedYear) : pickCurrentYear(allTerms)
    const terms = allTerms
      .filter((term) => term.year === year)
      .map((term) => ({ id: term.id, name: term.name, year: term.year }))
      .sort(sortTerms)

    if (terms.length === 0) {
      return NextResponse.json({ success: true, data: { year, terms: [], classes: [] } })
    }

    const termIds = terms.map((term) => term.id)

    const classes = await db.schoolClass.findMany({
      where: {
        status: 'ACTIVE',
        ...(classId ? { id: classId } : {}),
      },
      select: {
        id: true,
        name: true,
        stream: true,
        level: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    if (classes.length === 0) {
      return NextResponse.json({ success: true, data: { year, terms, classes: [] } })
    }

    const classIds = classes.map((item) => item.id)

    const [students, feeStructures, transactions] = await Promise.all([
      db.student.findMany({
        where: { status: 'ACTIVE', classId: { in: classIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          classId: true,
          class: {
            select: {
              name: true,
              level: true,
            },
          },
          studentType: true,
          usesTransport: true,
          busAssignments: {
            where: {
              status: 'ACTIVE',
            },
            select: {
              termId: true,
              transportMode: true,
              bus: { select: { routeName: true } },
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      db.feeStructure.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          classId: true,
          termId: true,
          amount: true,
          name: true,
          category: true,
          description: true,
        },
      }),
      db.feeTransaction.findMany({
        where: {
          status: 'COMPLETED',
          student: { classId: { in: classIds } },
        },
        select: {
          id: true,
          studentId: true,
          amount: true,
          paymentMethod: true,
          createdAt: true,
          receiptNumber: true,
          feeStructure: {
            select: {
              id: true,
              classId: true,
              termId: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const classStudents = new Map<string, typeof students>()
    for (const student of students) {
      if (!classStudents.has(student.classId)) classStudents.set(student.classId, [])
      classStudents.get(student.classId)!.push(student)
    }

    const studentTermPaid = new Map<string, number>()
    const studentTermCount = new Map<string, number>()
    const studentStructurePaid = new Map<string, number>()
    const studentLastPayment = new Map<
      string,
      { amount: number; paymentMethod: string; createdAt: Date; receiptNumber: string }
    >()

    for (const tx of transactions) {
      const termId = tx.feeStructure.termId
      const key = `${tx.studentId}:${termId}`
      const structureKey = `${tx.studentId}:${tx.feeStructure.id}`
      studentTermPaid.set(key, (studentTermPaid.get(key) || 0) + Number(tx.amount || 0))
      studentStructurePaid.set(structureKey, (studentStructurePaid.get(structureKey) || 0) + Number(tx.amount || 0))
      studentTermCount.set(key, (studentTermCount.get(key) || 0) + 1)
      if (!studentLastPayment.has(key)) {
        studentLastPayment.set(key, {
          amount: Number(tx.amount || 0),
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          receiptNumber: tx.receiptNumber,
        })
      }
    }

    const classesPayload = classes.map((schoolClass) => {
      const list = classStudents.get(schoolClass.id) || []

      const termSummary = terms.map((term) => {
        const expected = list.reduce(
          (sum, student) => {
            const transportRouteName =
              student.busAssignments.find((assignment) => assignment.termId === term.id)?.bus?.routeName || null
            const transportMode =
              student.busAssignments.find((assignment) => assignment.termId === term.id)?.transportMode || null
            return sum + getApplicableFeeStructures(
              feeStructures.filter((structure) => structure.termId === term.id),
              { ...student, transportRouteName, transportMode }
            ).reduce((structureSum, structure) => structureSum + Number(structure.amount || 0), 0)
          },
          0
        )
        const paid = list.reduce((sum, student) => sum + (studentTermPaid.get(`${student.id}:${term.id}`) || 0), 0)
        const balance = Math.max(0, expected - paid)
        const collectionRate = expected > 0 ? Number(((paid / expected) * 100).toFixed(2)) : 0
        const paymentStatus = getPaymentStatus(expected, paid)
        return {
          termId: term.id,
          termName: term.name,
          expected,
          paid,
          balance,
          paymentStatus,
          collectionRate,
        }
      })

      const studentsPayload = list.map((student) => {
        const firstDisplayedTerm = terms[0]
        const priorTerms = firstDisplayedTerm
          ? allTerms.filter((term) => sortTerms(term, firstDisplayedTerm) < 0)
          : []
        const arrearsBeforeYear = priorTerms.reduce(
          (sum, term) => {
            const transportRouteName =
              student.busAssignments.find((assignment) => assignment.termId === term.id)?.bus?.routeName || null
            const transportMode =
              student.busAssignments.find((assignment) => assignment.termId === term.id)?.transportMode || null
            const expected = getApplicableFeeStructures(
              feeStructures.filter((structure) => structure.termId === term.id),
              { ...student, transportRouteName, transportMode }
            ).reduce((structureSum, structure) => structureSum + Number(structure.amount || 0), 0)
            const paid = studentTermPaid.get(`${student.id}:${term.id}`) || 0
            return sum + Math.max(0, expected - paid)
          },
          0
        )

        const perTerm = terms.map((term) => {
          const transportRouteName =
            student.busAssignments.find((assignment) => assignment.termId === term.id)?.bus?.routeName || null
          const transportMode =
            student.busAssignments.find((assignment) => assignment.termId === term.id)?.transportMode || null
          const applicableStructures = getApplicableFeeStructures(
            feeStructures.filter((structure) => structure.termId === term.id),
            { ...student, transportRouteName, transportMode }
          )
          const expected = applicableStructures.reduce(
            (sum, structure) => sum + Number(structure.amount || 0),
            0
          )
          const paid = studentTermPaid.get(`${student.id}:${term.id}`) || 0
          const balance = Math.max(0, expected - paid)
          const paymentStatus = getPaymentStatus(expected, paid)
          const lastPayment = studentLastPayment.get(`${student.id}:${term.id}`)
          const nextDueStructure = applicableStructures.find((structure) => {
            const paidForStructure = studentStructurePaid.get(`${student.id}:${structure.id}`) || 0
            return paidForStructure < Number(structure.amount || 0)
          })
          return {
            termId: term.id,
            termName: term.name,
            expected,
            paid,
            balance,
            paymentStatus,
            paymentCount: studentTermCount.get(`${student.id}:${term.id}`) || 0,
            lastPaymentAt: lastPayment?.createdAt || null,
            lastPaymentMethod: lastPayment?.paymentMethod || null,
            lastPaymentAmount: lastPayment?.amount || 0,
            lastReceiptNumber: lastPayment?.receiptNumber || null,
            suggestedFeeStructureId: nextDueStructure?.id || applicableStructures[0]?.id || null,
          }
        })

        const overall = perTerm.reduce(
          (acc, term) => {
            acc.expected += term.expected
            acc.paid += term.paid
            acc.balance += term.balance
            return acc
          },
          { expected: 0, paid: 0, balance: 0 }
        )
        overall.expected += arrearsBeforeYear
        overall.balance += arrearsBeforeYear
        const overallStatus = getPaymentStatus(overall.expected, overall.paid)

        const nextDue = perTerm.find((term) => term.balance > 0)

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          perTerm,
          arrearsBeforeYear,
          overall,
          overallStatus,
          nextDueTermId: nextDue?.termId || perTerm[0]?.termId || null,
        }
      })

      return {
        id: schoolClass.id,
        name: schoolClass.name,
        stream: schoolClass.stream,
        level: schoolClass.level,
        studentCount: list.length,
        termSummary,
        students: studentsPayload,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        year,
        terms,
        classes: classesPayload,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to fetch class fee summary')
  }
}
