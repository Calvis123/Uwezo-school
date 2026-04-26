import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    return NextResponse.json({ success: true, data: user });
  } catch (e: any) {
    const code = e?.message === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: code });
  }
}

