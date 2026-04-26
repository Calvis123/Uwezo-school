import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'
import { db } from '@/lib/db'

function normalizePhone(input: string): string {
  const trimmed = (input || '').trim().replace(/\s+/g, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('07') && trimmed.length === 10) return `+254${trimmed.slice(1)}`
  return trimmed
}

function isValidE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone)
}

function makeId(): string {
  return `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES] })

    const body = await request.json().catch(() => null)
    const to = normalizePhone(body?.to || '')
    const message = String(body?.message || '').trim()

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: '`to` and `message` are required' },
        { status: 400 }
      )
    }

    if (!isValidE164(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Use +2547XXXXXXXX or 07XXXXXXXX.' },
        { status: 400 }
      )
    }

    const keys = ['sms_enabled', 'sms_provider', 'sms_sender_id']
    const settings = await db.systemSetting.findMany({ where: { key: { in: keys } } })
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value

    const enabled = (map.sms_enabled || 'false') === 'true'
    const provider = map.sms_provider || 'SIMULATED'
    const senderId = map.sms_sender_id || 'OLIVES'

    if (!enabled) {
      return NextResponse.json(
        { success: false, error: 'SMS is disabled in Settings.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: makeId(),
        to,
        senderId,
        provider,
        status: 'SIMULATED',
        queuedAt: new Date().toISOString(),
        messagePreview: message.slice(0, 120),
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to send SMS')
  }
}

