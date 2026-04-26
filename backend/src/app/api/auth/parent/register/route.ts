import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashSync } from "bcryptjs";
import { createSessionToken, sessionCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const admissionNumber = String(body?.admissionNumber || "").trim();
    const password = String(body?.password || "");
    const name = String(body?.name || "").trim();

    if (!email || !admissionNumber || !password) {
      return NextResponse.json(
        { success: false, error: "Email, admission number, and password are required" },
        { status: 400 }
      );
    }

    const student = await db.student.findUnique({ where: { admissionNumber } });
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const parent = await db.user.create({
      data: {
        name: name || email.split("@")[0] || "Parent",
        email,
        password: hashSync(password, 10),
        role: "PARENT",
        status: "ACTIVE",
      },
      select: { id: true, name: true, email: true, role: true, status: true, avatar: true },
    });

    // Link parent to student as primary guardian if none exists.
    const existingPrimary = await db.studentGuardian.findFirst({
      where: { studentId: student.id, isPrimary: true },
    });
    await db.studentGuardian.create({
      data: {
        studentId: student.id,
        guardianId: parent.id,
        relationship: "PARENT",
        isPrimary: existingPrimary ? false : true,
      },
    });

    const response = NextResponse.json({ success: true, data: { user: parent, role: parent.role } }, { status: 201 });
    const token = createSessionToken(parent.id, parent.role);
    response.cookies.set({ ...sessionCookieOptions(), value: token });
    return response;
  } catch (error: any) {
    console.error("Parent register error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

