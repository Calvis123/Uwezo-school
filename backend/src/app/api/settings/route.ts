import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth-server';
import { SYSTEM_SETTINGS_ROLES } from '@/lib/roles';
import { apiRouteError } from '@/lib/api-route-error';
import { getSettingsActiveTerm, syncFeeStructureStatusesToActiveTerm } from '@/lib/active-term';

export async function GET(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...SYSTEM_SETTINGS_ROLES] });

    const settings = await db.systemSetting.findMany();

    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error: unknown) {
    console.error('Error fetching settings:', error);
    return apiRouteError(error, 'Failed to fetch settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUser(request, { roles: [...SYSTEM_SETTINGS_ROLES] });

    const body = await request.json();
    const settings = (body?.settings && typeof body.settings === 'object')
      ? (body.settings as Record<string, string>)
      : (body as Record<string, string>);

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const normalizedSettings = Object.entries(settings).reduce<Record<string, string>>((acc, [key, value]) => {
      if (!key) return acc;
      if (value === null || value === undefined) return acc;
      if (typeof value === 'object') return acc;
      acc[String(key)] = String(value);
      return acc;
    }, {});

    if (Object.keys(normalizedSettings).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid setting values provided' },
        { status: 400 }
      );
    }

    const results: Awaited<ReturnType<typeof db.systemSetting.upsert>>[] = [];

    for (const [key, value] of Object.entries(normalizedSettings)) {
      const result = await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      results.push(result);
    }

    if ('academic_year' in normalizedSettings || 'current_term' in normalizedSettings) {
      const activeTerm = await getSettingsActiveTerm();
      if (activeTerm) {
        await db.term.updateMany({
          where: { id: { not: activeTerm.id }, status: 'ACTIVE' },
          data: { status: 'UPCOMING' },
        });
        await db.term.update({
          where: { id: activeTerm.id },
          data: { status: 'ACTIVE' },
        });
      }
      await syncFeeStructureStatusesToActiveTerm();
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: unknown) {
    console.error('Error updating settings:', error);
    return apiRouteError(error, 'Failed to update settings');
  }
}
