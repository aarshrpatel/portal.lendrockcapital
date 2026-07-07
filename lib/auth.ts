// Auth: HMAC-signed session cookies over dev-mode role users.
//
// The session value is `userId.expiresEpochMs.signature` where signature =
// HMAC-SHA256(AUTH_SECRET, `userId.expiresEpochMs`). Middleware does a cheap
// presence check + redirect; every server read verifies the signature here.
//
// This is the seam where Clerk lands in production (Module 09 §9.2.1: TOTP
// for internal roles, magic-link + SMS OTP step-up for external) — swap the
// internals of getSession/requireUser; call sites stay unchanged.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AUTH_SECRET } from "@/lib/env";
import type { User } from "@prisma/client";

const COOKIE = "lr_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h working session

function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

export function mintSessionValue(userId: string): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_TTL_MS / 1000 };
}

export function verifySessionValue(value: string | undefined): string | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  const expires = Number(expiresRaw);
  if (!userId || !Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = sign(`${userId}.${expiresRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export async function getSession(): Promise<User | null> {
  const userId = verifySessionValue(cookies().get(COOKIE)?.value);
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  return user?.active ? user : null;
}

export async function requireUser(): Promise<User> {
  const user = await getSession();
  if (!user) throw new Error("Not signed in");
  return user;
}

export function sessionCookieName() {
  return COOKIE;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

// Role capability map (Module 09 §9.4, condensed). ADMIN implies all.
const CAPS: Record<string, string[]> = {
  LO: ["lead.write", "deal.read", "deal.write", "termsheet.issue"],
  PROC: ["deal.read", "deal.write", "doc.review", "closing.run", "servicing.run"],
  UW: ["deal.read", "deal.write", "credit.decide", "draw.approve", "doc.review"],
  CM: ["deal.read", "investor.write", "capital.allocate", "distribution.run"],
  PRIN: ["*"],
  ADMIN: ["*"],
};

export function can(user: User, capability: string): boolean {
  const caps = CAPS[user.role] ?? [];
  return caps.includes("*") || caps.includes(capability);
}
