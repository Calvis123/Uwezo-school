import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionCookieName, readSessionToken } from "@/lib/session";

export type AuthedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
};

export async function requireUser(
  request: NextRequest,
  options?: { roles?: string[] }
): Promise<AuthedUser> {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = readSessionToken(token);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, status: true, avatar: true },
  });
  if (!user || user.status !== "ACTIVE") {
    throw new Error("UNAUTHORIZED");
  }
  // Super Admin has universal access across protected endpoints.
  if (options?.roles && user.role !== "SUPER_ADMIN" && !options.roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
