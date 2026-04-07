import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/notification-state';

// POST /api/notifications/[id]/read
// Mark a single notification as read
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    markNotificationRead(id);
    return NextResponse.json({
      success: true,
      data: { id, message: 'Notification marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id]
// Mark a single notification as read (legacy support)
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    markNotificationRead(id);
    return NextResponse.json({
      success: true,
      data: { id, message: 'Notification marked as read' },
    });
  } catch (error: unknown) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
