import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        data: { students: [], users: [], classes: [] },
      })
    }

    // Search students (by name, admission number) - SQLite contains is case-insensitive
    const students = await db.student.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { admissionNumber: { contains: q } },
        ],
        status: 'ACTIVE',
      },
      include: { class: true },
      take: 5,
      orderBy: { firstName: 'asc' },
    })

    const studentResults = students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      subtitle: s.admissionNumber,
      type: 'student' as const,
      href: `students-${s.id}`,
      className: s.class?.name || '',
    }))

    // Search users (by name, email)
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          },
          { status: 'ACTIVE' },
        ],
      },
      take: 5,
      orderBy: { name: 'asc' },
    })

    const userResults = users.map((u) => ({
      id: u.id,
      name: u.name,
      subtitle: u.email,
      type: 'user' as const,
      href: `users-${u.id}`,
      role: u.role,
    }))

    // Search classes (by name)
    const classes = await db.schoolClass.findMany({
      where: {
        name: { contains: q },
      },
      include: {
        _count: { select: { students: true } },
      },
      take: 5,
      orderBy: { name: 'asc' },
    })

    const classResults = classes.map((c) => ({
      id: c.id,
      name: c.name,
      subtitle: `${c._count.students} students`,
      type: 'class' as const,
      href: `class-${c.id}`,
      level: c.level,
    }))

    return NextResponse.json({
      success: true,
      data: {
        students: studentResults,
        users: userResults,
        classes: classResults,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
