import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'

const STUDENT_IMPORT_ROLES = ['SUPER_ADMIN', 'HEADTEACHER', 'SECRETARY'] as const

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ROWS = 500

interface CsvRow {
  firstName: string
  lastName: string
  gender: string
  studentType?: 'DAY' | 'BOARDING'
  usesTransport?: boolean
  dateOfBirth?: string
  className: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
}

function parseBooleanFlag(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return ['yes', 'true', '1', 'y'].includes(normalized)
}

function extractLastNumericAdmission(admissionNumber: string | null | undefined): number {
  if (!admissionNumber) return 0
  const match = admissionNumber.match(/(\d+)(?!.*\d)/)
  if (!match) return 0
  const value = Number(match[1])
  return Number.isFinite(value) ? value : 0
}

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STUDENT_IMPORT_ROLES] })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are accepted' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or has no data rows' },
        { status: 400 }
      )
    }

    // Parse header
    const header = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''))
    const headerMap: Record<string, string> = {}
    const expectedColumns = ['firstname', 'lastname', 'gender', 'class']
    const optionalColumns = ['dateofbirth', 'studenttype', 'usestransport', 'parentname', 'parentphone', 'parentemail']

    for (const col of expectedColumns.concat(optionalColumns)) {
      const idx = header.findIndex(h => h.includes(col))
      if (idx >= 0) {
        headerMap[col] = String(idx)
      }
    }

    // Check required columns
    for (const col of expectedColumns) {
      if (!(col in headerMap)) {
        return NextResponse.json(
          { success: false, error: `Missing required column: ${col}. Expected columns: firstName, lastName, gender, class` },
          { status: 400 }
        )
      }
    }

    // Get all classes
    const classes = await db.schoolClass.findMany()
    const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c]))

    // Get last admission number
    const lastStudent = await db.student.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { admissionNumber: true },
    })

    let nextNumber = 1
    if (lastStudent?.admissionNumber) {
      nextNumber = extractLastNumericAdmission(lastStudent.admissionNumber) + 1
    }

    // Parse data rows
    const dataLines = lines.slice(1, MAX_ROWS + 1)
    const errors: Array<{ row: number; error: string; data: Record<string, string> }> = []
    const validRows: CsvRow[] = []

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2 // 1-indexed, header is row 1
      const cols = parseCsvLine(dataLines[i])

      const firstName = cols[parseInt(headerMap['firstname'])] || ''
      const lastName = cols[parseInt(headerMap['lastname'])] || ''
      const gender = (cols[parseInt(headerMap['gender'])] || '').toUpperCase().trim()
      const className = cols[parseInt(headerMap['class'])] || ''
      const dateOfBirth = headerMap['dateofbirth'] ? cols[parseInt(headerMap['dateofbirth'])] || '' : ''
      const studentTypeRaw = headerMap['studenttype'] ? (cols[parseInt(headerMap['studenttype'])] || '').toUpperCase().trim() : ''
      const usesTransportRaw = headerMap['usestransport'] ? cols[parseInt(headerMap['usestransport'])] || '' : ''
      const parentName = headerMap['parentname'] ? cols[parseInt(headerMap['parentname'])] || '' : ''
      const parentPhone = headerMap['parentphone'] ? cols[parseInt(headerMap['parentphone'])] || '' : ''
      const parentEmail = headerMap['parentemail'] ? cols[parseInt(headerMap['parentemail'])] || '' : ''

      // Validate required fields
      if (!firstName || !lastName) {
        errors.push({ row: rowNum, error: 'First name and last name are required', data: { firstName, lastName } })
        continue
      }

      if (gender !== 'MALE' && gender !== 'FEMALE') {
        errors.push({ row: rowNum, error: 'Gender must be MALE or FEMALE', data: { firstName, lastName, gender } })
        continue
      }

      if (!className) {
        errors.push({ row: rowNum, error: 'Class is required', data: { firstName, lastName, className } })
        continue
      }

      const classRecord = classMap.get(className.toLowerCase())
      if (!classRecord) {
        errors.push({ row: rowNum, error: `Class "${className}" not found in the system`, data: { firstName, lastName, className } })
        continue
      }

      if (parentEmail && !validateEmail(parentEmail)) {
        errors.push({ row: rowNum, error: 'Invalid email format', data: { firstName, lastName, parentEmail } })
        continue
      }

      validRows.push({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        studentType: studentTypeRaw === 'BOARDING' ? 'BOARDING' : 'DAY',
        usesTransport: parseBooleanFlag(usesTransportRaw),
        dateOfBirth: dateOfBirth ? dateOfBirth.trim() : undefined,
        className: classRecord.name,
        parentName: parentName ? parentName.trim() : undefined,
        parentPhone: parentPhone ? parentPhone.trim() : undefined,
        parentEmail: parentEmail ? parentEmail.trim() : undefined,
      })
    }

    // Import valid rows
    let imported = 0
    for (const row of validRows) {
      try {
        const admissionNumber = `OLV-${String(nextNumber).padStart(4, '0')}`
        nextNumber++

        const classRecord = classMap.get(row.className.toLowerCase())!

        await db.student.create({
          data: {
            admissionNumber,
            firstName: row.firstName,
            lastName: row.lastName,
            gender: row.gender,
            studentType: row.studentType || 'DAY',
            usesTransport: row.studentType === 'BOARDING' ? false : Boolean(row.usesTransport),
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            classId: classRecord.id,
          },
        })

        // Note: Guardian creation would require existing User records.
        // For now, we log parent info but don't create guardians automatically
        // since the guardian must be a User in the system.
        if (row.parentName) {
          console.log(`Parent info for ${row.firstName} ${row.lastName}: ${row.parentName}, ${row.parentPhone || 'no phone'}, ${row.parentEmail || 'no email'}`)
        }

        imported++
      } catch (error: any) {
        errors.push({
          row: 0,
          error: `Failed to create student ${row.firstName} ${row.lastName}: ${error.message}`,
          data: { firstName: row.firstName, lastName: row.lastName },
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : [],
      totalProcessed: validRows.length + errors.length,
    })
  } catch (error: unknown) {
    console.error('Error importing students:', error)
    return apiRouteError(error, 'Failed to import students')
  }
}
