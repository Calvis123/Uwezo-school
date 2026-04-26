import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({ ...clearSessionCookieOptions(), value: "" });
  return response;
}

