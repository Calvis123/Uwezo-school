import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth-server';
import { STAFF_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Prisma.SchoolBusWhereInput = {};
    if (status) where.status = status;

    const buses = await db.schoolBus.findMany({
      where,
      orderBy: { busNumber: 'asc' },
    });

    const counts = await db.schoolBus.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const c of counts) {
      statusCounts[c.status] = c._count;
    }

    const allBuses = await db.schoolBus.findMany();
    const totalCapacity = allBuses.reduce((sum, b) => sum + b.capacity, 0);
    const totalStudents = allBuses.reduce((sum, b) => sum + b.currentStudents, 0);

    return NextResponse.json({
      success: true,
      data: buses,
      stats: {
        total: allBuses.length,
        active: statusCounts['ACTIVE'] || 0,
        maintenance: statusCounts['MAINTENANCE'] || 0,
        inactive: statusCounts['INACTIVE'] || 0,
        totalCapacity,
        totalStudents,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching buses:', error);
    return apiRouteError(error, 'Failed to fetch buses');
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...STAFF_ROLES] });

    const body = await request.json();
    const { busNumber, routeName, driverName, driverPhone, capacity, currentStudents, status, color } = body;

    if (!busNumber || !routeName || !driverName || !capacity) {
      return NextResponse.json(
        { success: false, error: 'Bus number, route name, driver name, and capacity are required' },
        { status: 400 }
      );
    }

    const existing = await db.schoolBus.findUnique({
      where: { busNumber },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Bus with number "${busNumber}" already exists` },
        { status: 409 }
      );
    }

    const bus = await db.schoolBus.create({
      data: {
        busNumber,
        routeName,
        driverName,
        driverPhone: driverPhone || null,
        capacity: Number(capacity),
        currentStudents: Number(currentStudents) || 0,
        status: status || 'ACTIVE',
        color: color || 'teal',
      },
    });

    return NextResponse.json({ success: true, data: bus });
  } catch (error: unknown) {
    console.error('Error creating bus:', error);
    return apiRouteError(error, 'Failed to create bus');
  }
}
