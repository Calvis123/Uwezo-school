import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.systemSetting.findMany();

    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = body.settings as Record<string, string>;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const [key, value] of Object.entries(settings)) {
      const result = await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
