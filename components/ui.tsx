import { STAGE_LABELS } from "@/lib/enums";
import { titleCase } from "@/lib/format";
import { IconInbox } from "@/components/Icons";

export function StagePill({ stage, active }: { stage: string; active?: boolean }) {
  const terminal = stage === "DEAD" || stage === "DECLINED";
  return (
    <span
      className={`pill font-mono ${
        terminal ? "bg-oxide-tint text-oxide" : active ? "bg-brand text-white" : "bg-brand-tint text-brand"
      }`}
    >
      {STAGE_LABELS[stage] ?? titleCase(stage)}
    </span>
  );
}

// tone → [text, dot] — dots carry the state; text stays quiet.
const TONES: Record<string, { cls: string; dot: string }> = {
  good: { cls: "bg-brand-tint/70 text-brand", dot: "bg-brand" },
  warn: { cls: "bg-bronze-tint/70 text-bronze", dot: "bg-bronze" },
  bad: { cls: "bg-oxide-tint/70 text-oxide", dot: "bg-oxide" },
  idle: { cls: "bg-line3 text-muted", dot: "bg-faint" },
  off: { cls: "bg-line3 text-faint", dot: "bg-line" },
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  // docs
  REQUESTED: "idle", UPLOADED: "warn", IN_REVIEW: "warn", ACCEPTED: "good", REJECTED: "bad", EXPIRED: "bad",
  // generic
  PASS: "good", FAIL: "bad", PENDING: "warn", BLOCKED: "bad", SENT: "good",
  PASS_WITH_EXCEPTIONS: "warn",
  // approvals
  APPROVED: "good", APPROVED_WITH_CONDITIONS: "warn", DECLINED: "bad", RETURNED: "warn",
  // participations
  SOFT_COMMIT: "idle", DOCS_OUT: "warn", SIGNED: "warn", WIRED: "good", ACTIVE: "good", REPAID: "idle", CANCELLED: "off",
  // investors / lines / tasks
  PROSPECT: "idle", ONBOARDING: "warn", INACTIVE: "off",
  FROZEN_SOFT: "warn", FROZEN_HARD: "bad", TERM_OUT: "bad", CLOSED: "off",
  OPEN: "idle", DONE: "good", IN_PROGRESS: "warn", WAITING_EXTERNAL: "warn",
  // bands
  HOT: "bad", WARM: "warn", COOL: "idle",
  // draws
  AUTO_APPROVED: "good", REVIEW: "warn", INSPECTION_ORDERED: "warn", INSPECTION_RECEIVED: "warn",
  // sba
  PREPARING: "idle", SUBMITTED: "warn", IN_UW: "warn", PROPOSAL: "good", WITHDRAWN: "off",
  DRAFT: "idle", COMPLETE: "good", CURRENT: "good", SETTLED: "good", INITIATED: "warn",
};

export function StatusPill({ status }: { status: string }) {
  const tone = TONES[STATUS_TONE[status] ?? "idle"];
  return (
    <span className={`pill font-mono ${tone.cls}`}>
      <span className={`pill-dot ${tone.dot}`} />
      {status}
    </span>
  );
}

const TYPE_TONE: Record<string, string> = {
  HM: "bg-brand text-white",
  BB: "bg-[#3E5C7A] text-white",
  WC: "bg-[#6B5C9E] text-white",
  SBA: "bg-bronze text-white",
};

export function TypeBadge({ dealType }: { dealType: string }) {
  return (
    <span className={`font-mono text-[10.5px] font-semibold tracking-wide px-1.5 py-0.5 rounded ${TYPE_TONE[dealType] ?? "bg-line3 text-muted"}`}>
      {dealType}
    </span>
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
      <div>
        <h1 className="h-serif text-[27px] font-semibold leading-tight">{title}</h1>
        {sub ? <p className="text-[13px] text-muted mt-1 max-w-3xl">{sub}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  pad = true,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-line2">
        <h2 className="label">{title}</h2>
        {action}
      </div>
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <IconInbox size={22} className="text-line" />
      <p className="text-[13px] text-faint mt-2">{text}</p>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="card px-4 py-3.5 relative overflow-hidden">
      <div className="label">{label}</div>
      <div className="font-serif text-[26px] text-ink tabular-nums leading-tight mt-1">{value}</div>
      {sub ? (
        <div className={`text-2xs mt-0.5 ${tone === "bad" ? "text-oxide" : tone === "warn" ? "text-bronze" : "text-faint"}`}>{sub}</div>
      ) : null}
    </div>
  );
}

export function Meter({ pct, tone }: { pct: number; tone?: "good" | "warn" | "bad" }) {
  const bar = tone === "bad" ? "!bg-oxide" : tone === "warn" ? "!bg-bronze" : "";
  return (
    <div className="meter">
      <div className={bar} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand-tint text-brand font-sans font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
