import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;
    const bus = await db.schoolBus.findUnique({
      where: { id },
    });

    if (!bus) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: bus });
  } catch (error: unknown) {
    console.error('Error fetching bus:', error);
    return apiRouteError(error, 'Failed to fetch bus');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;
    const body = await request.json();
    const { busNumber, routeName, driverName, driverPhone, capacity, currentStudents, status, color } = body;

    const existing = await db.schoolBus.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      );
    }

    if (busNumber && busNumber !== existing.busNumber) {
      const busNumberConflict = await db.schoolBus.findUnique({
        where: { busNumber },
      });
      if (busNumberConflict) {
        return NextResponse.json(
          { success: false, error: `Bus with number "${busNumber}" already exists` },
          { status: 409 }
        );
      }
    }

    const bus = await db.schoolBus.update({
      where: { id },
      data: {
        ...(busNumber && { busNumber }),
        ...(routeName && { routeName }),
        ...(driverName && { driverName }),
        ...(driverPhone !== undefined && { driverPhone: driverPhone || null }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(currentStudents !== undefined && { currentStudents: Number(currentStudents) }),
        ...(status && { status }),
        ...(color && { color }),
      },
    });

    return NextResponse.json({ success: true, data: bus });
  } catch (error: unknown) {
    console.error('Error updating bus:', error);
    return apiRouteError(error, 'Failed to update bus');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { id } = await params;
    const existing = await db.schoolBus.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Bus not found' },
        { status: 404 }
      );
    }

    const bus = await db.schoolBus.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ success: true, data: bus });
  } catch (error: unknown) {
    console.error('Error deleting bus:', error);
    return apiRouteError(error, 'Failed to delete bus');
  }
}
