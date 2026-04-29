import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'

const SMS_ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR'] as const

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
    await requireUser(request, { roles: [...SMS_ALLOWED_ROLES] })

    const body = await request.json().catch(() => null)
    const recipientIds: string[] = Array.isArray(body?.recipientIds) ? body.recipientIds : []
    const message = String(body?.message || '').trim()

    if (recipientIds.length === 0 || !message) {
      return NextResponse.json(
        { success: false, error: '`recipientIds` and `message` are required' },
        { status: 400 }
      )
    }

    const keys = ['sms_enabled', 'sms_provider', 'sms_sender_id']
    const settings = await db.systemSetting.findMany({ where: { key: { in: keys } } })
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value

    const enabled = (map.sms_enabled || 'false') === 'true'
    const provider = map.sms_provider || 'SIMULATED'
    const senderId = map.sms_sender_id || 'UWEZOSCHOOL'

    if (!enabled) {
      return NextResponse.json(
        { success: false, error: 'SMS is disabled in Settings.' },
        { status: 400 }
      )
    }

    const recipients = await db.user.findMany({
      where: { id: { in: recipientIds }, status: 'ACTIVE' },
      select: { id: true, name: true, phone: true },
    })

    const rows = recipients.map((user) => {
      const phone = normalizePhone(user.phone || '')
      if (!phone) {
        return { userId: user.id, name: user.name, status: 'SKIPPED', reason: 'No phone number' as const }
      }
      if (!isValidE164(phone)) {
        return { userId: user.id, name: user.name, status: 'SKIPPED', reason: 'Invalid phone format' as const, phone }
      }
      return {
        userId: user.id,
        name: user.name,
        phone,
        status: 'SIMULATED' as const,
        smsId: makeId(),
        queuedAt: new Date().toISOString(),
      }
    })

    const sent = rows.filter((r) => r.status === 'SIMULATED').length
    const skipped = rows.length - sent

    return NextResponse.json({
      success: true,
      data: {
        senderId,
        provider,
        messagePreview: message.slice(0, 120),
        totalRecipients: rows.length,
        sent,
        skipped,
        results: rows,
      },
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to send bulk SMS')
  }
}

