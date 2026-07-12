// Public lead capture — the endpoint lendrockcapital.com CTAs POST to.
// Capture-first: step 1 creates the lead immediately (Module 01 §2.2).

import { NextRequest, NextResponse } from "next/server";
import { createLeadRecord } from "@/app/actions";
import { rateLimit } from "@/lib/ratelimit";
import { PUBLIC_LEADS_RPM } from "@/lib/env";
import { isValidEmail, isValidPhone } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  const limit = rateLimit(`leads:${ip}`, PUBLIC_LEADS_RPM);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests — try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (!firstName || !lastName || (!email && !phone)) {
    return NextResponse.json(
      { error: "firstName, lastName, and email or phone are required" },
      { status: 422 }
    );
  }
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "email must be a valid email address" }, { status: 422 });
  }
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json({ error: "phone must be a valid 10-digit phone number" }, { status: 422 });
  }
  // Honeypot spam control: bots fill the hidden field.
  if (body.website) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { leadId, dq } = await createLeadRecord({
    source: "WEB",
    formVariant: String(body.formVariant ?? "apply"),
    firstName,
    lastName,
    email,
    phone,
    companyName: String(body.companyName ?? ""),
    state: String(body.state ?? "").toUpperCase().slice(0, 2),
    useOfFunds: String(body.useOfFunds ?? ""),
    amountCents: Math.round(Number(body.amount ?? 0) * 100),
    fundingTimeline: String(body.fundingTimeline ?? ""),
    creditStated: String(body.creditStated ?? "UNKNOWN"),
    smsConsent: Boolean(body.smsConsent),
    utmSource: String(body.utmSource ?? ""),
    utmCampaign: String(body.utmCampaign ?? ""),
  });

  return NextResponse.json({ ok: true, leadId, disqualified: Boolean(dq) }, { status: 201 });
}
