import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { status: 'COMPLETED' }

    if (classId && classId !== 'all') {
      where.feeStructure = { classId }
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z')
    }

    const transactions = await db.feeTransaction.findMany({
      where,
      include: {
        student: true,
        feeStructure: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const csvLines = [
      'Student Name,Admission No,Fee Type,Amount,Payment Method,Receipt No,Date',
      ...transactions.map((t) => {
        const studentName = t.student ? `${t.student.firstName} ${t.student.lastName}` : ''
        const admissionNo = t.student?.admissionNumber || ''
        const feeType = t.feeStructure?.name || ''
        const amount = t.amount.toString()
        const method = t.paymentMethod || ''
        const receipt = t.receiptNumber || ''
        const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : ''
        const escaped = (val: string) => `"${val.replace(/"/g, '""')}"`
        return [
          escaped(studentName),
          escaped(admissionNo),
          escaped(feeType),
          amount,
          escaped(method),
          escaped(receipt),
          escaped(date),
        ].join(',')
      }),
    ]

    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fees-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
