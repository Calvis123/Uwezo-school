import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { apiRouteError } from '@/lib/api-route-error'
import { db } from '@/lib/db'

const EXPORT_HISTORY_KEY = 'export_history'
const HISTORY_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER', 'DOS', 'SECRETARY', 'BURSAR'] as const

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...HISTORY_ROLES] })

    const { searchParams } = new URL(request.url)
    const category = (searchParams.get('category') || '').toUpperCase()
    const reportType = (searchParams.get('reportType') || '').toLowerCase()
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || 100)))

    const setting = await db.systemSetting.findUnique({
      where: { key: EXPORT_HISTORY_KEY },
      select: { value: true },
    })

    let entries: any[] = []
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value)
        entries = Array.isArray(parsed) ? parsed : []
      } catch {
        entries = []
      }
    }

    const filtered = entries
      .filter((entry) => (category ? String(entry.category || '').toUpperCase() === category : true))
      .filter((entry) => (reportType ? String(entry.reportType || '').toLowerCase() === reportType : true))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: filtered,
    })
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to load export history')
  }
}
