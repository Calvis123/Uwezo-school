import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/library/books — List with pagination, search, filters, stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    const [books, total, stats] = await Promise.all([
      db.libraryBook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.libraryBook.count({ where }),
      // Aggregate stats
      db.$transaction([
        db.libraryBook.count(),
        db.libraryBook.count({ where: { status: 'AVAILABLE' } }),
        db.libraryBook.count({ where: { status: 'LOW_STOCK' } }),
        db.libraryBook.count({ where: { status: 'OUT_OF_STOCK' } }),
        db.bookIssue.count({ where: { status: 'ISSUED' } }),
        db.bookIssue.count({ where: { status: 'OVERDUE' } }),
      ]),
    ])

    const [
      totalBooks,
      availableBooks,
      lowStockBooks,
      outOfStockBooks,
      issuedCount,
      overdueCount,
    ] = stats

    return NextResponse.json({
      success: true,
      data: {
        books,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          totalBooks,
          availableBooks,
          lowStockBooks,
          outOfStockBooks,
          issuedCount,
          overdueCount,
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

// POST /api/library/books — Create book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      author,
      isbn,
      category,
      publisher,
      year,
      totalCopies,
      shelfLocation,
    } = body

    if (!title || !author) {
      return NextResponse.json(
        { success: false, error: 'Title and author are required' },
        { status: 400 }
      )
    }

    const availableCopies = totalCopies || 1
    let bookStatus = 'AVAILABLE'
    if (availableCopies === 0) bookStatus = 'OUT_OF_STOCK'
    else if (availableCopies <= 3) bookStatus = 'LOW_STOCK'

    const book = await db.libraryBook.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        category: category || 'FICTION',
        publisher: publisher || null,
        year: year ? parseInt(year) : null,
        totalCopies: totalCopies || 1,
        availableCopies,
        shelfLocation: shelfLocation || null,
        status: bookStatus,
      },
    })

    return NextResponse.json({ success: true, data: book })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
