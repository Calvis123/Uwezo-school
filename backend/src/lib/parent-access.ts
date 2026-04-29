import { db } from '@/lib/db';

export async function getParentPrimaryStudentId(guardianId: string): Promise<string | null> {
  const links = await db.studentGuardian.findMany({
    where: { guardianId },
    orderBy: { createdAt: 'desc' },
    select: {
      studentId: true,
      isPrimary: true,
    },
  });

  if (links.length === 0) return null;
  const primaryLink = links.find((link) => link.isPrimary) || links[0];
  return primaryLink?.studentId || null;
}

export async function getParentScopedStudentIds(guardianId: string): Promise<string[]> {
  const primaryStudentId = await getParentPrimaryStudentId(guardianId);
  return primaryStudentId ? [primaryStudentId] : [];
}

