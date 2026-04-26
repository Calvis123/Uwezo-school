import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareSync } from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
import { createSessionToken, sessionCookieOptions } from '@/lib/session';

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `+254${digits}`;
  return phone.trim();
}

// 5 attempts per 15 minutes per IP
const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    const { success, remaining, resetAt } = rateLimit(
      `login:${ip}`,
      LOGIN_RATE_LIMIT,
      LOGIN_WINDOW_MS
    );

    if (!success) {
      const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ── Authentication ─────────────────────────────────────────────
    const body = await request.json();
    const { email, phone, password } = body;
    const identifier = String(email || phone || '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Email or phone and password are required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(identifier);
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: normalizedPhone },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(remaining - 1),
          },
        }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact administration.' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(remaining - 1),
          },
        }
      );
    }

    const isPasswordValid = compareSync(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        {
          status: 401,
          headers: {
            'X-RateLimit-Remaining': String(remaining - 1),
          },
        }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        role: user.role,
      },
    });

    const token = createSessionToken(user.id, user.role);
    response.cookies.set({ ...sessionCookieOptions(), value: token });
    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
