import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/library/issues — List book issues with student/book names, status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { student: { firstName: { contains: search } } },
        { student: { lastName: { contains: search } } },
        { student: { admissionNumber: { contains: search } } },
        { book: { title: { contains: search } } },
        { book: { author: { contains: search } } },
      ]
    }

    const [issues, total] = await Promise.all([
      db.bookIssue.findMany({
        where,
        include: {
          book: { select: { title: true, author: true, isbn: true } },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bookIssue.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        issues,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/library/issues — Issue a book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookId, studentId, dueDate } = body

    if (!bookId || !studentId || !dueDate) {
      return NextResponse.json(
        { success: false, error: 'Book ID, Student ID, and Due Date are required' },
        { status: 400 }
      )
    }

    const book = await db.libraryBook.findUnique({ where: { id: bookId } })
    if (!book) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      )
    }

    if (book.availableCopies <= 0) {
      return NextResponse.json(
        { success: false, error: 'No copies available for issue' },
        { status: 400 }
      )
    }

    const student = await db.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      )
    }

    // Create issue and decrement available copies in a transaction
    const issue = await db.$transaction(async (tx) => {
      const newIssue = await tx.bookIssue.create({
        data: {
          bookId,
          studentId,
          dueDate: new Date(dueDate),
          status: 'ISSUED',
        },
        include: {
          book: { select: { title: true, author: true } },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
      })

      const newAvailable = book.availableCopies - 1
      let newStatus = 'AVAILABLE'
      if (newAvailable === 0) newStatus = 'OUT_OF_STOCK'
      else if (newAvailable <= 3) newStatus = 'LOW_STOCK'

      await tx.libraryBook.update({
        where: { id: bookId },
        data: {
          availableCopies: newAvailable,
          status: newStatus,
        },
      })

      return newIssue
    })

    return NextResponse.json({ success: true, data: issue })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
