import { NextRequest, NextResponse } from 'next/server';
import { markAllRead } from '@/lib/notification-state';
import { requireUser } from '@/lib/auth-server';
import { ALL_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';

// POST /api/notifications/read-all
// Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });
    markAllRead(user.id);
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking all notifications as read:', error);
    return apiRouteError(error, 'Failed to mark all notifications as read');
  }
}

// PUT /api/notifications/all
// Mark all notifications as read (legacy support)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request, { roles: [...ALL_ROLES] });
    markAllRead(user.id);
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking all notifications as read:', error);
    return apiRouteError(error, 'Failed to mark all notifications as read');
  }
}
