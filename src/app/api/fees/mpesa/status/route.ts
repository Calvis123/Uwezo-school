import { NextRequest, NextResponse } from 'next/server'

// In-memory store for simulated M-Pesa transactions
// In production, this would query the M-Pesa API
const transactionStore = new Map<string, {
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  mpesaReceipt: string
  amount: number
  createdAt: number
}>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')

    if (!ref) {
      return NextResponse.json(
        { success: false, error: 'Transaction reference is required' },
        { status: 400 }
      )
    }

    // Simulate 2 second processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate M-Pesa status check
    // In production, this would call the M-Pesa API to check transaction status
    // For simulation, we return COMPLETED with the receipt
    const mpesaReceipt = `SBK${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    return NextResponse.json({
      success: true,
      data: {
        transactionRef: ref,
        status: 'COMPLETED',
        mpesaReceipt,
        message: 'Payment processed successfully',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Error checking M-Pesa status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
