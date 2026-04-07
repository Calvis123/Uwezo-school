import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// 30 requests per minute per IP
const SEARCH_RATE_LIMIT = 30
const SEARCH_WINDOW_MS = 60 * 1000 // 1 minute

export async function GET(request: NextRequest) {
  try {
    // ── Rate limiting ──────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { success, remaining } = rateLimit(
      `search:${ip}`,
      SEARCH_RATE_LIMIT,
      SEARCH_WINDOW_MS
    )

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many search requests. Please slow down.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    // ── Search logic ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json(
        {
          success: true,
          data: { students: [], users: [], classes: [], notices: [] },
        },
        {
          headers: {
            'X-RateLimit-Remaining': String(remaining),
          },
        }
      )
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
      take: 8,
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

    // Search notices (by title)
    const notices = await db.schoolNotice.findMany({
      where: {
        AND: [
          { title: { contains: q } },
          { isPublished: true },
        ],
      },
      take: 5,
      orderBy: { publishedAt: 'desc' },
    })

    const noticeResults = notices.map((n) => ({
      id: n.id,
      name: n.title,
      subtitle: n.category.charAt(0) + n.category.slice(1).toLowerCase(),
      type: 'notice' as const,
      href: `notice-${n.id}`,
      category: n.category,
      publishedAt: n.publishedAt?.toISOString() || null,
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          students: studentResults,
          users: userResults,
          classes: classResults,
          notices: noticeResults,
        },
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
