// Liveness/readiness probe for uptime monitors and the deploy pipeline.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.user.count();
    return NextResponse.json({ ok: true, db: "up", at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "down", at: new Date().toISOString() }, { status: 503 });
  }
}
