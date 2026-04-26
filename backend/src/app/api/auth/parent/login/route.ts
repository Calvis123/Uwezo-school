import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, sessionCookieOptions } from '@/lib/session'

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('254')) return `+${digits}`
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`
  return phone.trim()
}

function phoneCandidates(phone: string) {
  const raw = phone.trim()
  const digits = raw.replace(/\D/g, '')
  const candidates = new Set<string>()
  if (raw) candidates.add(raw)
  if (digits) candidates.add(digits)

  if (digits.startsWith('254')) {
    candidates.add(`+${digits}`)
    candidates.add(`0${digits.slice(3)}`)
  }

  if (digits.startsWith('0')) {
    const rest = digits.slice(1)
    candidates.add(`+254${rest}`)
    candidates.add(`254${rest}`)
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    candidates.add(`+254${digits}`)
    candidates.add(`254${digits}`)
    candidates.add(`0${digits}`)
  }

  const normalized = normalizePhone(phone)
  if (normalized) candidates.add(normalized)

  return Array.from(candidates)
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body?.name || '').trim()
    const phone = String(body?.phone || '').trim()

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Parent name and phone are required' },
        { status: 400 }
      )
    }

    const targetName = normalizeName(name)
    const candidates = phoneCandidates(phone)

    const possibleParents = await db.user.findMany({
      where: {
        role: 'PARENT',
        status: 'ACTIVE',
        OR: candidates.map((candidate) => ({ phone: candidate })),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        phone: true,
      },
    })

    const parent = possibleParents.find((p) => normalizeName(p.name) === targetName)

    if (!parent) {
      return NextResponse.json(
        { success: false, error: 'Invalid parent name or phone number' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user: parent,
        role: parent.role,
      },
    })

    const token = createSessionToken(parent.id, parent.role)
    response.cookies.set({ ...sessionCookieOptions(), value: token })
    return response
  } catch (error: unknown) {
    console.error('Parent login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
