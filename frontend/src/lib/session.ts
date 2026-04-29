import crypto from "node:crypto";
import { env } from "@/lib/env";

const COOKIE_NAME = "uwezo_school_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  role: string;
  iat: number;
  exp: number;
};

function base64UrlEncode(data: Buffer): string {
  return data
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(data: string): Buffer {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((data.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(input: string): string {
  const mac = crypto.createHmac("sha256", env.AUTH_SECRET).update(input).digest();
  return base64UrlEncode(mac);
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createSessionToken(userId: string, role: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId,
    role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function readSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body);
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.userId || !payload?.role) return null;
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
  };
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
