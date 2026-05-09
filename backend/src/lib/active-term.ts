import { db } from '@/lib/db'

type DbClient = typeof db

export async function getSettingsActiveTerm(client: DbClient = db) {
  const settings = await client.systemSetting.findMany({
    where: { key: { in: ['academic_year', 'current_term'] } },
    select: { key: true, value: true },
  })
  const map = settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})

  const year = Number(map.academic_year)
  const name = String(map.current_term || '').trim()
  if (Number.isFinite(year) && name) {
    const configuredTerm = await client.term.findFirst({
      where: {
        year,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, name: true, year: true, status: true },
    })
    if (configuredTerm) return configuredTerm
  }

  return client.term.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, year: true, status: true },
  })
}

export async function syncFeeStructureStatusesToActiveTerm(client: DbClient = db) {
  const activeTerm = await getSettingsActiveTerm(client)
  await client.feeStructure.updateMany({
    where: {},
    data: { status: 'INACTIVE' },
  })
  if (!activeTerm) return { activeTerm: null, activatedCount: 0 }

  const activated = await client.feeStructure.updateMany({
    where: { termId: activeTerm.id },
    data: { status: 'ACTIVE' },
  })
  return { activeTerm, activatedCount: activated.count }
}
