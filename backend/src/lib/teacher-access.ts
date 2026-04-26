import { db } from '@/lib/db'
import type { AuthedUser } from '@/lib/auth-server'

export async function getTeacherAssignedClassIds(user: Pick<AuthedUser, 'id' | 'role'>) {
  if (user.role !== 'TEACHER') return null

  const classes = await db.schoolClass.findMany({
    where: { teacherId: user.id },
    select: { id: true },
  })

  return classes.map((cls) => cls.id)
}

export async function canTeacherAccessClass(
  user: Pick<AuthedUser, 'id' | 'role'>,
  classId: string
) {
  const classIds = await getTeacherAssignedClassIds(user)
  if (classIds === null) return true
  return classIds.includes(classId)
}
