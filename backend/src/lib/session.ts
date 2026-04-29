import crypto from "node:crypto";
import { env } from "@/lib/env";

const COOKIE_NAME = "uwezo_school_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function parseTtlSeconds(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SESSION_TTL_SECONDS;
  return Math.floor(parsed);
}

const SESSION_TTL_SECONDS = parseTtlSeconds(process.env.SESSION_TTL_SECONDS);

function cookieSameSite(): "lax" | "strict" | "none" {
  const raw = (process.env.SESSION_COOKIE_SAMESITE || "lax").toLowerCase();
  if (raw === "strict" || raw === "none" || raw === "lax") return raw;
  return "lax";
}

function cookieSecure(): boolean {
  if (typeof process.env.SESSION_COOKIE_SECURE === "string") {
    return process.env.SESSION_COOKIE_SECURE.toLowerCase() === "true";
  }
  return env.NODE_ENV === "production";
}

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
  const secure = cookieSecure();
  const sameSite = cookieSameSite();
  const maxAge = SESSION_TTL_SECONDS;
  return {
    name: COOKIE_NAME,
    httpOnly: true as const,
    sameSite,
    secure,
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
    ...(process.env.SESSION_COOKIE_DOMAIN ? { domain: process.env.SESSION_COOKIE_DOMAIN } : {}),
  };
}

export function clearSessionCookieOptions() {
  const secure = cookieSecure();
  const sameSite = cookieSameSite();
  return {
    name: COOKIE_NAME,
    httpOnly: true as const,
    sameSite,
    secure,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    ...(process.env.SESSION_COOKIE_DOMAIN ? { domain: process.env.SESSION_COOKIE_DOMAIN } : {}),
  };
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}
