import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { apiRouteError } from '@/lib/api-route-error';

const TERM_MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HEADTEACHER'] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...TERM_MANAGER_ROLES] });

    const { id } = await params;
    const body = await request.json();

    const existing = await db.term.findUnique({
      where: { id },
      select: { id: true, name: true, year: true, startDate: true, endDate: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Term not found' },
        { status: 404 }
      );
    }

    const nextName = body?.name ? String(body.name).trim() : existing.name;
    const nextYear = body?.year ? Number(body.year) : existing.year;
    const nextStartDate = body?.startDate ? new Date(body.startDate) : new Date(existing.startDate);
    const nextEndDate = body?.endDate ? new Date(body.endDate) : new Date(existing.endDate);
    const nextStatus = body?.status ? String(body.status).toUpperCase() : existing.status;

    if (!nextName || !nextYear) {
      return NextResponse.json(
        { success: false, error: 'name and year are required' },
        { status: 400 }
      );
    }
    if (!['UPCOMING', 'ACTIVE', 'COMPLETED'].includes(nextStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    if (Number.isNaN(nextStartDate.getTime()) || Number.isNaN(nextEndDate.getTime()) || nextStartDate >= nextEndDate) {
      return NextResponse.json(
        { success: false, error: 'Invalid start/end dates' },
        { status: 400 }
      );
    }

    const duplicate = await db.term.findFirst({
      where: {
        id: { not: id },
        year: nextYear,
        name: nextName,
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'A term with this name already exists in that year' },
        { status: 409 }
      );
    }

    const updated = await db.$transaction(async (tx) => {
      if (nextStatus === 'ACTIVE') {
        await tx.term.updateMany({
          where: { status: 'ACTIVE', id: { not: id } },
          data: { status: 'UPCOMING' },
        });
        await tx.feeStructure.updateMany({
          where: {},
          data: { status: 'INACTIVE' },
        });
      }

      const term = await tx.term.update({
        where: { id },
        data: {
          name: nextName,
          year: nextYear,
          startDate: nextStartDate,
          endDate: nextEndDate,
          status: nextStatus,
        },
      });

      if (nextStatus === 'ACTIVE') {
        await tx.feeStructure.updateMany({
          where: { termId: id },
          data: { status: 'ACTIVE' },
        });
        await tx.systemSetting.upsert({
          where: { key: 'academic_year' },
          update: { value: String(nextYear) },
          create: { key: 'academic_year', value: String(nextYear) },
        });
        await tx.systemSetting.upsert({
          where: { key: 'current_term' },
          update: { value: nextName },
          create: { key: 'current_term', value: nextName },
        });
      }
      if (nextStatus !== 'ACTIVE') {
        await tx.feeStructure.updateMany({
          where: { termId: id },
          data: { status: 'INACTIVE' },
        });
      }

      return term;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return apiRouteError(error, 'Failed to update term');
  }
}
