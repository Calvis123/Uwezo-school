import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
  } catch (error: any) {
    console.error('Error processing M-Pesa payment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process M-Pesa payment' },
      { status: 500 }
    )
  }
}
