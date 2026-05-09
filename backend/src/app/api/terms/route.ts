import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

const TERM_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] as const;

function getSequence(name: string) {
  return Number(String(name).match(/\d+/)?.[0] || '99');
}

function shiftDateToYear(date: Date, year: number) {
  return new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const terms = await db.term.findMany({
      include: {
        _count: {
          select: {
            exams: true,
            feeStructures: true,
            attendances: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }],
    });

    return NextResponse.json({ success: true, data: terms });
  } catch (error: unknown) {
    console.error('Error fetching terms:', error);
    return apiRouteError(error, 'Failed to fetch terms');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...TERM_MANAGER_ROLES] });

    const body = await request.json();

    if (String(body?.mode || '').toUpperCase() === 'GENERATE_YEAR') {
      const allTerms = await db.term.findMany({
        select: { id: true, name: true, year: true, startDate: true, endDate: true },
        orderBy: [{ year: 'asc' }, { startDate: 'asc' }],
      });

      const targetYear =
        Number(body?.year) ||
        (allTerms.length > 0 ? Math.max(...allTerms.map((term) => term.year)) + 1 : new Date().getFullYear());

      if (!Number.isFinite(targetYear) || targetYear < 2000 || targetYear > 2100) {
        return NextResponse.json(
          { success: false, error: 'Invalid target year' },
          { status: 400 }
        );
      }

      const previousYear = allTerms
        .filter((term) => term.year === targetYear - 1)
        .sort((a, b) => getSequence(a.name) - getSequence(b.name));

      const templates = previousYear.length > 0
        ? previousYear.map((term) => ({
            name: term.name,
            startDate: shiftDateToYear(new Date(term.startDate), targetYear),
            endDate: shiftDateToYear(new Date(term.endDate), targetYear),
          }))
        : [
            {
              name: 'Term 1',
              startDate: new Date(Date.UTC(targetYear, 0, 6)),
              endDate: new Date(Date.UTC(targetYear, 3, 4)),
            },
            {
              name: 'Term 2',
              startDate: new Date(Date.UTC(targetYear, 3, 28)),
              endDate: new Date(Date.UTC(targetYear, 7, 1)),
            },
            {
              name: 'Term 3',
              startDate: new Date(Date.UTC(targetYear, 8, 1)),
              endDate: new Date(Date.UTC(targetYear, 10, 28)),
            },
          ];

      const existing = await db.term.findMany({
        where: { year: targetYear },
        select: { id: true, name: true },
      });
      const existingNames = new Set(existing.map((term) => term.name.trim().toLowerCase()));

      const toCreate = templates.filter(
        (template) => !existingNames.has(template.name.trim().toLowerCase())
      );

      if (toCreate.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            year: targetYear,
            createdCount: 0,
            skippedCount: templates.length,
            message: 'All standard terms for this year already exist',
          },
        });
      }

      const created = await db.$transaction(
        toCreate.map((template) =>
          db.term.create({
            data: {
              name: template.name,
              year: targetYear,
              startDate: template.startDate,
              endDate: template.endDate,
              status: 'UPCOMING',
            },
          })
        )
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            year: targetYear,
            createdCount: created.length,
            skippedCount: templates.length - created.length,
            created,
          },
        },
        { status: 201 }
      );
    }

    const name = String(body?.name || '').trim();
    const year = Number(body?.year);
    const startDate = body?.startDate ? new Date(body.startDate) : null;
    const endDate = body?.endDate ? new Date(body.endDate) : null;
    const status = String(body?.status || 'UPCOMING').toUpperCase();

    if (!name || !year || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'name, year, startDate, and endDate are required' },
        { status: 400 }
      );
    }
    if (!['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Invalid start/end dates' },
        { status: 400 }
      );
    }

    const duplicate = await db.term.findFirst({
      where: {
        year,
        name,
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'A term with this name already exists in the selected year' },
        { status: 409 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      if (status === 'ACTIVE') {
        await tx.term.updateMany({
          where: { status: 'ACTIVE' },
          data: { status: 'UPCOMING' },
        });
        await tx.feeStructure.updateMany({
          where: {},
          data: { status: 'INACTIVE' },
        });
      }

      const term = await tx.term.create({
        data: {
          name,
          year,
          startDate,
          endDate,
          status,
        },
      });

      if (status === 'ACTIVE') {
        await tx.feeStructure.updateMany({
          where: { termId: term.id },
          data: { status: 'ACTIVE' },
        });
        await tx.systemSetting.upsert({
          where: { key: 'academic_year' },
          update: { value: String(year) },
          create: { key: 'academic_year', value: String(year) },
        });
        await tx.systemSetting.upsert({
          where: { key: 'current_term' },
          update: { value: name },
          create: { key: 'current_term', value: name },
        });
      }

      return term;
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating terms:', error);
    return apiRouteError(error, 'Failed to create term record');
  }
}
