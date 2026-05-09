import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// Level order for class hierarchy
const LEVEL_ORDER: Record<string, number> = {
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
}

const getClassLevel = (cls: { name: string; level: string }) => {
  const name = cls.name.toLowerCase()
  if (
    name.includes('playgroup') ||
    name.includes('play group') ||
    name.includes('pre-nursery') ||
    name.includes('pre nursery') ||
    cls.level === 'PRE_NURSERY'
  ) return 'PLAYGROUP'
  if (
    name.includes('pp1') ||
    name.includes('pre-primary 1') ||
    name.includes('pre primary 1') ||
    name === 'nursery' ||
    cls.level === 'NURSERY'
  ) return 'PP1'
  if (
    name.includes('pp2') ||
    name.includes('pre-primary 2') ||
    name.includes('pre primary 2')
  ) return 'PP2'

  const gradeMatch = name.match(/grade\s*([1-9])/)
  if (gradeMatch) return `GRADE_${gradeMatch[1]}`

  return cls.level
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...ADMIN_ROLES, 'HEADTEACHER', 'TEACHER'] })

    const classes = await db.schoolClass.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [
        { level: 'asc' },
        { stream: 'asc' },
      ],
    })

    // Group classes by level with order
    const levelGroups: Record<string, { level: string; order: number; classes: any[] }> = {}

    classes.forEach(cls => {
      const classLevel = getClassLevel(cls)
      if (!levelGroups[classLevel]) {
        levelGroups[classLevel] = {
          level: classLevel,
          order: LEVEL_ORDER[classLevel] ?? 99,
          classes: [],
        }
      }
      levelGroups[classLevel].classes.push({
        id: cls.id,
        name: cls.name,
        level: classLevel,
        stream: cls.stream,
        capacity: cls.capacity,
        studentCount: cls._count.students,
      })
    })

    // Sort levels by order
    const sortedGroups = Object.values(levelGroups).sort((a, b) => a.order - b.order)

    // Build promotion suggestions (next level in sequence)
    const suggestions: { from: any; to: any[]; fromCount: number }[] = []
    const groupArray = sortedGroups

    for (let i = 0; i < groupArray.length - 1; i++) {
      const currentLevel = groupArray[i]
      const nextLevel = groupArray[i + 1]
      const fromCount = currentLevel.classes.reduce((sum: number, c: any) => sum + c.studentCount, 0)

      if (fromCount > 0) {
        suggestions.push({
          from: { level: currentLevel.level, classes: currentLevel.classes },
          to: nextLevel.classes,
          fromCount,
        })
      }
    }

    // Also build a simple next-class map for each class
    const nextClassMap: Record<string, string[]> = {}
    for (const cls of classes) {
      const currentOrder = LEVEL_ORDER[getClassLevel(cls)] ?? 99
      // Find the next level
      const nextClasses = classes.filter(c => {
        const nextOrder = LEVEL_ORDER[getClassLevel(c)] ?? 99
        return nextOrder === currentOrder + 1 && (cls.stream === c.stream || !c.stream)
      })
      nextClassMap[cls.id] = nextClasses.map(c => c.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        classes,
        levelGroups: sortedGroups,
        suggestions,
        nextClassMap,
      },
    })
  } catch (error: unknown) {
    console.error('Promotion config error:', error)
    return apiRouteError(error, 'Failed to fetch promotion config')
  }
}
