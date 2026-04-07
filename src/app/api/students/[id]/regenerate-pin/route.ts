import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function generatePin(): string {
  const min = 100000
  const max = 999999
  return String(Math.floor(Math.random() * (max - min + 1)) + min)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const student = await db.student.findUnique({
      where: { id },
      select: { id: true, resultsPin: true },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      )
    }

    // Generate a unique PIN
    let pin = generatePin()
    let attempts = 0
    let existing = await db.student.findUnique({
      where: { resultsPin: pin },
    })

    while (existing && attempts < 100) {
      pin = generatePin()
      existing = await db.student.findUnique({
        where: { resultsPin: pin },
      })
      attempts++
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique PIN. Please try again.' },
        { status: 500 }
      )
    }

    await db.student.update({
      where: { id },
      data: { resultsPin: pin },
    })

    return NextResponse.json({
      success: true,
      data: { resultsPin: pin },
    })
  } catch (error: any) {
    console.error('Error regenerating PIN:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to regenerate PIN' },
      { status: 500 }
    )
  }
}
