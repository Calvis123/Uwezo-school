const CLASS_LEVEL_ORDER: Record<string, number> = {
  PLAYGROUP: 0,
  PRE_NURSERY: 0,
  NURSERY: 0,
  PP1: 1,
  PP2: 2,
  GRADE_1: 3,
  GRADE_2: 4,
  GRADE_3: 5,
  GRADE_4: 6,
  GRADE_5: 7,
  GRADE_6: 8,
  GRADE_7: 9,
  GRADE_8: 10,
  GRADE_9: 11,
  JUNIOR_SECONDARY: 12,
}

type ClassLike = {
  name?: string | null
  level?: string | null
  stream?: string | null
}

export const getClassDisplayName = (classItem?: ClassLike) => {
  if (!classItem) return '-'
  const name = classItem.name || 'Class'
  const stream = classItem.stream?.trim()
  if (!stream) return name
  if (new RegExp(`\\s+${stream}$`, 'i').test(name)) return name
  return `${name} ${stream}`
}

export const getNormalizedClassLevel = (classItem: ClassLike) => {
  const name = String(classItem.name || '').toLowerCase()
  const level = String(classItem.level || '').toUpperCase()

  if (
    name.includes('playgroup') ||
    name.includes('play group') ||
    name.includes('pre-nursery') ||
    name.includes('pre nursery') ||
    level === 'PLAYGROUP' ||
    level === 'PRE_NURSERY'
  ) return 'PLAYGROUP'

  if (
    name.includes('pp1') ||
    name.includes('pre-primary 1') ||
    name.includes('pre primary 1') ||
    name === 'nursery' ||
    level === 'PP1' ||
    level === 'NURSERY'
  ) return 'PP1'

  if (
    name.includes('pp2') ||
    name.includes('pre-primary 2') ||
    name.includes('pre primary 2') ||
    level === 'PP2'
  ) return 'PP2'

  const gradeMatch = name.match(/grade\s*([1-9])/) || level.match(/^GRADE_(\d)$/)
  if (gradeMatch) return `GRADE_${gradeMatch[1]}`

  return level
}

export const sortClassesByLevelAndStream = <T extends ClassLike>(items: T[]) => {
  return [...items].sort((a, b) => {
    const levelDiff =
      (CLASS_LEVEL_ORDER[getNormalizedClassLevel(a)] ?? 999) -
      (CLASS_LEVEL_ORDER[getNormalizedClassLevel(b)] ?? 999)
    if (levelDiff !== 0) return levelDiff

    const nameDiff = String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
    if (nameDiff !== 0) return nameDiff

    return String(a.stream || '').localeCompare(String(b.stream || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  })
}
