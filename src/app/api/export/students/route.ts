import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const status = searchParams.get('status')

    const where: any = {}
    if (classId && classId !== 'all') where.classId = classId
    if (status && status !== 'all') where.status = status

    const students = await db.student.findMany({
      where,
      include: {
        class: true,
        guardians: {
          include: { guardian: true },
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const csvLines = [
      'Admission No,Name,Class,Gender,Status,Parent Contact',
      ...students.map((s) => {
        const name = `${s.firstName} ${s.lastName}`
        const className = s.class?.name || ''
        const gender = s.gender || ''
        const parentContact = s.guardians[0]?.guardian?.phone || ''
        const escaped = (val: string) => `"${(val || '').replace(/"/g, '""')}"`
        return [
          escaped(s.admissionNumber),
          escaped(name),
          escaped(className),
          escaped(gender),
          escaped(s.status),
          escaped(parentContact),
        ].join(',')
      }),
    ]

    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
