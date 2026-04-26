import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { STAFF_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// POST /api/library/issues/[id]/return — Return a book
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] })

    const { id } = await params

    const issue = await db.bookIssue.findUnique({
      where: { id },
      include: { book: true },
    })

    if (!issue) {
      return NextResponse.json(
        { success: false, error: 'Issue record not found' },
        { status: 404 }
      )
    }

    if (issue.status === 'RETURNED') {
      return NextResponse.json(
        { success: false, error: 'Book already returned' },
        { status: 400 }
      )
    }

    const updatedIssue = await db.$transaction(async (tx) => {
      // Update issue record
      const returned = await tx.bookIssue.update({
        where: { id },
        data: {
          returnDate: new Date(),
          status: 'RETURNED',
        },
        include: {
          book: { select: { title: true, author: true, isbn: true } },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
      })

      // Increment available copies
      const book = issue.book
      const newAvailable = book.availableCopies + 1
      let newStatus = 'AVAILABLE'
      if (newAvailable <= 3) newStatus = 'LOW_STOCK'

      await tx.libraryBook.update({
        where: { id: issue.bookId },
        data: {
          availableCopies: newAvailable,
          status: newStatus,
        },
      })

      return returned
    })

    return NextResponse.json({ success: true, data: updatedIssue })
  } catch (error: unknown) {
    return apiRouteError(error, 'Internal server error')
  }
}
