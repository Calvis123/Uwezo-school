import { NextResponse } from 'next/server';
import { markAllRead } from '@/lib/notification-state';

// POST /api/notifications/read-all
// Mark all notifications as read
export async function POST() {
  try {
    markAllRead();
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/all
// Mark all notifications as read (legacy support)
export async function PUT() {
  try {
    markAllRead();
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
