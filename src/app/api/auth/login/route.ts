import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compareSync } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
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
        { status: 401 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact administration.' },
        { status: 401 }
      );
    }

    const isPasswordValid = compareSync(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
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
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
