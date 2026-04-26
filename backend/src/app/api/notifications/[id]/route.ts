import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/notification-state';
import { requireUser } from '@/lib/auth-server';
import { ALL_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

// POST /api/notifications/[id]/read
// Mark a single notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });
    const { id } = await params;
    markNotificationRead(user.id, id);
    return NextResponse.json({
      success: true,
      data: { id, message: 'Notification marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking notification as read:', error);
    return apiRouteError(error, 'Failed to mark notification as read');
  }
}

// PUT /api/notifications/[id]
// Mark a single notification as read (legacy support)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });
    const { id } = await params;
    markNotificationRead(user.id, id);
    return NextResponse.json({
      success: true,
      data: { id, message: 'Notification marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking notification as read:', error);
    return apiRouteError(error, 'Failed to mark notification as read');
  }
}
