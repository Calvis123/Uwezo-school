import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { isAllClassesScopeDescription } from '@/lib/fee-structure-scope'

type TermLite = {
  id: string
  name: string
  year: number
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
      select: { id: true, name: true, year: true, status: true },
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
          usesTransport: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      db.feeStructure.findMany({
        where: {
          status: 'ACTIVE',
          termId: { in: termIds },
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
          feeStructure: { termId: { in: termIds } },
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

    const classTermBaseExpected = new Map<string, number>()
    const classTermTransportExpected = new Map<string, number>()
    const termGlobalBaseExpected = new Map<string, number>()
    const termGlobalTransportExpected = new Map<string, number>()
    const classTermDefaultStructure = new Map<string, string>()
    const termGlobalDefaultStructure = new Map<string, string>()
    for (const structure of feeStructures) {
      const appliesToAllClasses = isAllClassesScopeDescription(structure.description)
      const key = `${structure.classId}:${structure.termId}`
      if (appliesToAllClasses) {
        if (structure.category === 'TRANSPORT') {
          termGlobalTransportExpected.set(
            structure.termId,
            (termGlobalTransportExpected.get(structure.termId) || 0) + Number(structure.amount || 0)
          )
        } else {
          termGlobalBaseExpected.set(
            structure.termId,
            (termGlobalBaseExpected.get(structure.termId) || 0) + Number(structure.amount || 0)
          )
        }
        if (!termGlobalDefaultStructure.has(structure.termId)) {
          termGlobalDefaultStructure.set(structure.termId, structure.id)
        }
      } else {
        if (!classIds.includes(structure.classId)) continue
        if (structure.category === 'TRANSPORT') {
          classTermTransportExpected.set(
            key,
            (classTermTransportExpected.get(key) || 0) + Number(structure.amount || 0)
          )
        } else {
          classTermBaseExpected.set(
            key,
            (classTermBaseExpected.get(key) || 0) + Number(structure.amount || 0)
          )
        }
        if (!classTermDefaultStructure.has(key)) {
          classTermDefaultStructure.set(key, structure.id)
        }
      }
    }

    const studentTermPaid = new Map<string, number>()
    const studentTermCount = new Map<string, number>()
    const studentLastPayment = new Map<
      string,
      { amount: number; paymentMethod: string; createdAt: Date; receiptNumber: string }
    >()

    for (const tx of transactions) {
      const termId = tx.feeStructure.termId
      const key = `${tx.studentId}:${termId}`
      studentTermPaid.set(key, (studentTermPaid.get(key) || 0) + Number(tx.amount || 0))
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
        const key = `${schoolClass.id}:${term.id}`
        const baseExpectedPerStudent =
          (classTermBaseExpected.get(key) || 0) + (termGlobalBaseExpected.get(term.id) || 0)
        const transportExpectedPerStudent =
          (classTermTransportExpected.get(key) || 0) + (termGlobalTransportExpected.get(term.id) || 0)
        const expected = list.reduce(
          (sum, student) =>
            sum + baseExpectedPerStudent + (student.usesTransport ? transportExpectedPerStudent : 0),
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
        const perTerm = terms.map((term) => {
          const key = `${schoolClass.id}:${term.id}`
          const expected =
            (classTermBaseExpected.get(key) || 0) +
            (termGlobalBaseExpected.get(term.id) || 0) +
            (student.usesTransport
              ? (classTermTransportExpected.get(key) || 0) + (termGlobalTransportExpected.get(term.id) || 0)
              : 0)
          const paid = studentTermPaid.get(`${student.id}:${term.id}`) || 0
          const balance = Math.max(0, expected - paid)
          const paymentStatus = getPaymentStatus(expected, paid)
          const lastPayment = studentLastPayment.get(`${student.id}:${term.id}`)
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
            suggestedFeeStructureId:
              classTermDefaultStructure.get(`${schoolClass.id}:${term.id}`) ||
              termGlobalDefaultStructure.get(term.id) ||
              null,
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
        const overallStatus = getPaymentStatus(overall.expected, overall.paid)

        const nextDue = perTerm.find((term) => term.balance > 0)

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          perTerm,
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
