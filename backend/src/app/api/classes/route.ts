import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

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
};

const getClassLevel = (cls: { name: string; level: string }) => {
  const name = cls.name.toLowerCase();
  if (
    name.includes('playgroup') ||
    name.includes('play group') ||
    name.includes('pre-nursery') ||
    name.includes('pre nursery') ||
    cls.level === 'PRE_NURSERY'
  ) return 'PLAYGROUP';
  if (
    name.includes('pp1') ||
    name.includes('pre-primary 1') ||
    name.includes('pre primary 1') ||
    name === 'nursery' ||
    cls.level === 'NURSERY'
  ) return 'PP1';
  if (
    name.includes('pp2') ||
    name.includes('pre-primary 2') ||
    name.includes('pre primary 2')
  ) return 'PP2';

  const gradeMatch = name.match(/grade\s*([1-9])/);
  if (gradeMatch) return `GRADE_${gradeMatch[1]}`;

  return cls.level;
};

const getClassLevelOrder = (cls: { name: string; level: string }) => {
  return LEVEL_ORDER[getClassLevel(cls)] ?? 999;
};

export async function GET(request: NextRequest) {
  try {
    const authed = await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.SchoolClassWhereInput = {};
    if (level) {
      const gradeName = level.startsWith('GRADE_') ? `Grade ${level.replace('GRADE_', '')}` : null;
      const prePrimaryName = level === 'PP1' ? 'PP1' : level === 'PP2' ? 'PP2' : null;
      const isEcde = level === 'ECDE';
      const isPlaygroup = level === 'PLAYGROUP' || level === 'PRE_NURSERY';
      where.OR = [
        { level },
        ...(isEcde ? [{ level: { in: ['PLAYGROUP', 'PRE_NURSERY', 'NURSERY', 'PP1', 'PP2'] } }] : []),
        ...(isPlaygroup ? [{ level: { in: ['PLAYGROUP', 'PRE_NURSERY'] } }] : []),
        ...(gradeName ? [{ name: { contains: gradeName, mode: 'insensitive' as const } }] : []),
        ...(prePrimaryName ? [{ name: { contains: prePrimaryName, mode: 'insensitive' as const } }] : []),
        ...(isPlaygroup
          ? [
              { name: { contains: 'Playgroup', mode: 'insensitive' as const } },
              { name: { contains: 'Play group', mode: 'insensitive' as const } },
              { name: { contains: 'Pre-Nursery', mode: 'insensitive' as const } },
              { name: { contains: 'Pre Nursery', mode: 'insensitive' as const } },
            ]
          : []),
        ...(isEcde
          ? [
              { name: { contains: 'Playgroup', mode: 'insensitive' as const } },
              { name: { contains: 'Play group', mode: 'insensitive' as const } },
              { name: { contains: 'Nursery', mode: 'insensitive' as const } },
              { name: { contains: 'Pre-Nursery', mode: 'insensitive' as const } },
              { name: { contains: 'Pre Nursery', mode: 'insensitive' as const } },
              { name: { contains: 'PP1', mode: 'insensitive' as const } },
              { name: { contains: 'PP2', mode: 'insensitive' as const } },
              { name: { contains: 'Pre-primary 1', mode: 'insensitive' as const } },
              { name: { contains: 'Pre-primary 2', mode: 'insensitive' as const } },
            ]
          : []),
      ];
    }
    if (status) where.status = status;
    if (authed.role === 'TEACHER') where.teacherId = authed.id;
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const classes = await db.schoolClass.findMany({
      where,
      include: {
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { stream: 'asc' }],
    });

    const classesWithCount = classes
      .map((cls) => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        stream: cls.stream,
        teacherId: cls.teacherId,
        capacity: cls.capacity,
        status: cls.status,
        studentCount: cls._count.students,
      }))
      .sort((a, b) => {
        const levelDiff = getClassLevelOrder(a) - getClassLevelOrder(b);
        if (levelDiff !== 0) return levelDiff;
        const nameDiff = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        if (nameDiff !== 0) return nameDiff;
        return (a.stream || '').localeCompare(b.stream || '', undefined, { numeric: true, sensitivity: 'base' });
      });

    return NextResponse.json({ success: true, data: classesWithCount });
  } catch (error: unknown) {
    console.error('Error fetching classes:', error);
    return apiRouteError(error, 'Failed to fetch classes');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const body = await request.json();
    const { name, level, stream, capacity, teacherId, status } = body;

    if (!name || !level) {
      return NextResponse.json(
        { success: false, error: 'Name and level are required' },
        { status: 400 }
      );
    }

    const existingClass = await db.schoolClass.findFirst({
      where: { name, stream: stream || null },
    });

    if (existingClass) {
      return NextResponse.json(
        { success: false, error: 'A class with this name and stream already exists' },
        { status: 409 }
      );
    }

    const newClass = await db.schoolClass.create({
      data: {
        name,
        level,
        stream: stream || null,
        capacity: capacity || 40,
        teacherId: teacherId || null,
        status: status || 'ACTIVE',
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newClass.id,
        name: newClass.name,
        level: newClass.level,
        stream: newClass.stream,
        teacherId: newClass.teacherId,
        capacity: newClass.capacity,
        status: newClass.status,
        studentCount: newClass._count.students,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating class:', error);
    return apiRouteError(error, 'Failed to create class');
  }
}
