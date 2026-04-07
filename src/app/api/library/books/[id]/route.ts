import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/library/books/[id] — Update book
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, author, isbn, category, publisher, year, totalCopies, shelfLocation } = body

    const existing = await db.libraryBook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      )
    }

    // Calculate how many are currently issued
    const issuedCount = await db.bookIssue.count({
      where: { bookId: id, status: { in: ['ISSUED', 'OVERDUE'] } },
    })

    const newTotal = totalCopies !== undefined ? parseInt(totalCopies) : existing.totalCopies
    const newAvailable = newTotal - issuedCount

    if (newAvailable < 0) {
      return NextResponse.json(
        { success: false, error: `Cannot reduce copies below ${issuedCount} (currently issued)` },
        { status: 400 }
      )
    }

    let bookStatus = 'AVAILABLE'
    if (newAvailable === 0) bookStatus = 'OUT_OF_STOCK'
    else if (newAvailable <= 3) bookStatus = 'LOW_STOCK'

    const book = await db.libraryBook.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(author !== undefined && { author }),
        ...(isbn !== undefined && { isbn: isbn || null }),
        ...(category !== undefined && { category }),
        ...(publisher !== undefined && { publisher: publisher || null }),
        ...(year !== undefined && { year: year ? parseInt(year) : null }),
        totalCopies: newTotal,
        availableCopies: newAvailable,
        ...(shelfLocation !== undefined && { shelfLocation: shelfLocation || null }),
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

// DELETE /api/library/books/[id] — Delete book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.libraryBook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      )
    }

    // Check if any copies are issued
    const issuedCount = await db.bookIssue.count({
      where: { bookId: id, status: { in: ['ISSUED', 'OVERDUE'] } },
    })

    if (issuedCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete book: ${issuedCount} copies currently issued` },
        { status: 400 }
      )
    }

    // Delete related issues first, then book
    await db.bookIssue.deleteMany({ where: { bookId: id } })
    await db.libraryBook.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { message: 'Book deleted' } })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
