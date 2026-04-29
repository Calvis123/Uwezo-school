import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { summarizeStudentFeeBalance } from '@/lib/fee-balance'
import { ALL_CLASSES_MARKER } from '@/lib/fee-structure-scope'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

function generateGrade(marks: number): string {
  if (marks >= 80) return 'A'
  if (marks >= 75) return 'A-'
  if (marks >= 70) return 'B+'
  if (marks >= 65) return 'B'
  if (marks >= 60) return 'B-'
  if (marks >= 55) return 'C+'
  if (marks >= 50) return 'C'
  if (marks >= 45) return 'C-'
  if (marks >= 40) return 'D+'
  if (marks >= 35) return 'D'
  if (marks >= 30) return 'D-'
  return 'E'
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { pin } = body

    if (!pin || typeof pin !== 'string' || pin.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN format' },
        { status: 400 }
      )
    }

    // Look up student by resultsPin
    const student = await db.student.findUnique({
      where: { resultsPin: pin.trim() },
      include: {
        class: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Invalid PIN' },
        { status: 404 }
      )
    }

    // Get latest term for this student's class
    const latestTerm = await db.term.findFirst({
      where: {
        exams: {
          some: {
            classId: student.classId,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    // Get latest exam results
    const latestExam = latestTerm
      ? await db.exam.findFirst({
          where: {
            classId: student.classId,
            termId: latestTerm.id,
            status: 'COMPLETED',
          },
          orderBy: { endDate: 'desc' },
        })
      : null

    let examResults: Array<{
      subject: string
      marks: number
      grade: string
      remarks: string
    }> = []
    let examName = ''
    let termName = ''

    if (latestExam) {
      const marks = await db.examMark.findMany({
        where: {
          examId: latestExam.id,
          studentId: student.id,
        },
        include: {
          subject: true,
        },
      })

      examName = latestExam.name
      termName = `${latestTerm?.name || ''} ${latestTerm?.year || ''}`

      examResults = marks.map((m) => ({
        subject: m.subject.name,
        marks: Math.round(m.marks),
        grade: m.grade || generateGrade(m.marks),
        remarks: m.remarks || (m.marks >= 80 ? 'Excellent' : m.marks >= 60 ? 'Good' : m.marks >= 40 ? 'Fair' : 'Needs Improvement'),
      }))
    }

    // Calculate class position for the latest exam
    let classPosition = 0
    let totalStudentsInClass = 0
    if (latestExam) {
      const allStudentTotals = await db.examMark.groupBy({
        by: ['studentId'],
        where: { examId: latestExam.id },
        _sum: { marks: true },
      })

      const studentTotal = allStudentTotals
        .find((s) => s.studentId === student.id)?._sum.marks || 0

      const sorted = allStudentTotals
        .map((s) => ({ studentId: s.studentId, total: s._sum.marks || 0 }))
        .sort((a, b) => b.total - a.total)

      totalStudentsInClass = sorted.length
      classPosition = sorted.findIndex((s) => s.studentId === student.id) + 1
    }

    // Calculate attendance rate for current term
    let attendanceRate = 0
    if (latestTerm) {
      const totalDays = await db.attendance.count({
        where: {
          studentId: student.id,
          termId: latestTerm.id,
        },
      })

      const presentDays = await db.attendance.count({
        where: {
          studentId: student.id,
          termId: latestTerm.id,
          status: { in: ['PRESENT', 'LATE'] },
        },
      })

      attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0
    }

    // Calculate fee balance
    let feeBalance = 0
    if (latestTerm) {
      const feeStructures = await db.feeStructure.findMany({
        where: {
          OR: [
            { classId: student.classId },
            { description: { startsWith: ALL_CLASSES_MARKER } },
          ],
          termId: latestTerm.id,
        },
      })

      const transactions = await db.feeTransaction.findMany({
        where: {
          studentId: student.id,
          status: 'COMPLETED',
        },
      })
      feeBalance = summarizeStudentFeeBalance(feeStructures, transactions, student).balance
    }

    // Calculate summary
    const totalMarks = examResults.reduce((sum, r) => sum + r.marks, 0)
    const meanGrade = examResults.length > 0
      ? generateGrade(totalMarks / examResults.length)
      : 'N/A'
    const meanMarks = examResults.length > 0
      ? Math.round(totalMarks / examResults.length)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          gender: student.gender,
        },
        exam: {
          name: examName,
          term: termName,
          results: examResults,
        },
        summary: {
          totalMarks,
          meanMarks,
          meanGrade,
          position: classPosition,
          totalInClass: totalStudentsInClass,
        },
        attendance: {
          rate: attendanceRate,
        },
        fees: {
          outstandingBalance: feeBalance,
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching public results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch results' },
      { status: 500 }
    )
  }
}
