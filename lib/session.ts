import crypto from "crypto";
import { loadEnvLocal } from "./loadEnv";

loadEnvLocal();

/**
 * Signed, stateless session tokens for both the member portal and the admin
 * panel. No new dependency — just Node's built-in `crypto` (HMAC-SHA256),
 * which is already available in Next.js's server runtime (proxy.ts runs on
 * the Node.js runtime by default in this Next.js version — see AGENTS.md).
 *
 * A token is `<base64url payload>.<base64url HMAC signature>`. The payload
 * carries only an id + role + expiry — never a password or other sensitive
 * data (see Next.js's own auth guide: session payloads should be the
 * minimum needed to look the user up again).
 *
 * Requires an AUTH_SECRET environment variable in production — see
 * .env.example. Falls back to a fixed insecure value in local dev only, so
 * `next dev` still works without extra setup; this fallback is refused
 * outside development.
 */

const AUTH_SECRET = process.env.AUTH_SECRET;

function getSecret(): string {
  if (AUTH_SECRET) return AUTH_SECRET;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-insecure-secret-do-not-use-in-production";
  }
  throw new Error(
    "AUTH_SECRET is not set. Add it to .env.local (see .env.example) and to your Vercel " +
      "project's environment variables before deploying — sessions cannot be signed without it."
  );
}

// Cookie names + lifetimes live here (not in lib/dal.ts) so that proxy.ts —
// which must NOT import the DB client or next/headers — can reference them
// without pulling in that heavier import graph.
export const MEMBER_COOKIE = "fv_member_session";
export const ADMIN_COOKIE = "fv_admin_session";
export const MEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — shorter, more sensitive data

export type SessionRole = "member" | "admin";

export type SessionPayload = {
  sub: string; // member id or admin user id
  role: SessionRole;
  exp: number; // ms since epoch
};

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(sub: string, role: SessionRole, maxAgeSeconds: number): string {
  const payload: SessionPayload = { sub, role, exp: Date.now() + maxAgeSeconds * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!timingSafeEqualStr(sig, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (payload.role !== "member" && payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}
