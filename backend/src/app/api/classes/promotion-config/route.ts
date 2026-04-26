import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-server'
import { ADMIN_ROLES } from '@/lib/roles'
import { apiRouteError } from '@/lib/api-route-error'

// Level order for class hierarchy
const LEVEL_ORDER: Record<string, number> = {
  PRE_NURSERY: 0,
  NURSERY: 1,
  PP1: 2,
  PP2: 3,
  GRADE_1: 4,
  GRADE_2: 5,
  GRADE_3: 6,
  GRADE_4: 7,
  GRADE_5: 8,
  GRADE_6: 9,
  JUNIOR_SECONDARY: 10,
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
    const sortedLevels = new Set<string>()

    classes.forEach(cls => {
      if (!levelGroups[cls.level]) {
        levelGroups[cls.level] = {
          level: cls.level,
          order: LEVEL_ORDER[cls.level] ?? 99,
          classes: [],
        }
        sortedLevels.add(cls.level)
      }
      levelGroups[cls.level].classes.push({
        id: cls.id,
        name: cls.name,
        level: cls.level,
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
      const currentOrder = LEVEL_ORDER[cls.level] ?? 99
      // Find the next level
      const nextClasses = classes.filter(c => {
        const nextOrder = LEVEL_ORDER[c.level] ?? 99
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
