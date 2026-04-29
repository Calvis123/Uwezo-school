import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { FINANCE_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { isAllClassesScopeDescription } from '@/lib/fee-structure-scope'

function generateRandomString(prefix: string, length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = prefix
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...FINANCE_ROLES] })

    const body = await request.json()
    const { studentId, amount, phoneNumber, feeStructureId } = body

    if (!studentId || !amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Student ID, amount, and phone number are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    if (feeStructureId) {
      const [student, feeStructure] = await Promise.all([
        db.student.findUnique({
          where: { id: studentId },
          select: { id: true, status: true, studentType: true, usesTransport: true, classId: true },
        }),
        db.feeStructure.findUnique({
          where: { id: feeStructureId },
          select: { id: true, category: true, status: true, classId: true, description: true },
        }),
      ])

      if (!student || student.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Student not found or inactive' },
          { status: 404 }
        )
      }
      if (!feeStructure) {
        return NextResponse.json(
          { success: false, error: 'Fee structure not found' },
          { status: 404 }
        )
      }
      if (feeStructure.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Selected fee structure is inactive' },
          { status: 400 }
        )
      }
      const appliesToAllClasses = isAllClassesScopeDescription(feeStructure.description)
      if (!appliesToAllClasses && student.classId !== feeStructure.classId) {
        return NextResponse.json(
          { success: false, error: 'Selected fee structure does not belong to the student class' },
          { status: 400 }
        )
      }
      if (feeStructure.category === 'TRANSPORT' && !student.usesTransport) {
        return NextResponse.json(
          { success: false, error: 'Transport charges are only allowed for students marked as using transport' },
          { status: 400 }
        )
      }
      if (feeStructure.category === 'BOARDING' && student.studentType !== 'BOARDING') {
        return NextResponse.json(
          { success: false, error: 'Boarding fees can only be recorded for boarding students' },
          { status: 400 }
        )
      }
      if (feeStructure.category === 'TUITION' && student.studentType === 'BOARDING') {
        return NextResponse.json(
          { success: false, error: 'Tuition fees are not applicable to boarding students in this setup' },
          { status: 400 }
        )
      }
    }

    // Validate phone number format (Kenyan: 07XX XXX XXX or +254XXXXXXXXX)
    const phoneRegex = /^(07\d{8}|\+254\d{9})$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Use Kenyan format: 07XX XXX XXX' },
        { status: 400 }
      )
    }

    // Simulate M-Pesa STK push
    const transactionRef = generateRandomString('QKR')
    const mpesaReceipt = generateRandomString('SBK')

    // Simulate delay for STK push (instant response, status checked later)
    const responseData = {
      transactionRef,
      status: 'PENDING',
      mpesaReceipt: mpesaReceipt,
      phoneNumber: phoneNumber.replace(/\s/g, ''),
      amount: parseFloat(amount),
      studentId,
      feeStructureId,
      timestamp: new Date().toISOString(),
      message: 'STK push sent successfully. Please check your phone and enter your M-Pesa PIN.',
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error: unknown) {
    console.error('Error processing M-Pesa payment:', error)
    return apiRouteError(error, 'Failed to process M-Pesa payment')
  }
}
