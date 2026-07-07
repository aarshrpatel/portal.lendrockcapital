// Dev-mode auth: a signed-in internal user is a cookie holding a User id.
// This is the seam where Clerk lands in production (Module 09 §9.2.1:
// TOTP for internal roles, magic-link + SMS OTP step-up for external) —
// swap getSession/requireUser internals; call sites stay unchanged.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

const COOKIE = "lr_user";

export async function getSession(): Promise<User | null> {
  const id = cookies().get(COOKIE)?.value;
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

export async function requireUser(): Promise<User> {
  const user = await getSession();
  if (!user) throw new Error("Not signed in");
  return user;
}

export function sessionCookieName() {
  return COOKIE;
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
