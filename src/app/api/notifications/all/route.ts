import { NextResponse } from 'next/server';

// PUT /api/notifications/all
// Mark all notifications as read
// Since notifications are generated on-the-fly from existing data,
// we return success so the client can update its local state

export async function PUT() {
  try {
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
