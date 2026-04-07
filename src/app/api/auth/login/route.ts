import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareSync } from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';

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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
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

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
