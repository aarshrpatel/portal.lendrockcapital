import { badge } from "@/lib/domain";

export function Badge({
  bg,
  fg,
  bd,
  children,
  className,
}: {
  bg: string;
  fg: string;
  bd?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span style={badge(bg, fg, bd)} className={className}>
      {children}
    </span>
  );
}

export function Avatar({
  initials,
  bg,
  fg,
  size = 34,
  fontSize = 12,
}: {
  initials: string;
  bg: string;
  fg: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        background: bg,
        color: fg,
        fontSize,
      }}
    >
      {initials}
    </div>
  );
}

// White card wrapper used across screens.
export function Card({
  children,
  className = "",
  pad = false,
}: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-line bg-white ${
        pad ? "p-[18px]" : ""
      } ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(16,24,40,.04)" }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line2 px-[18px] pb-[11px] pt-[15px]">
      <h3 className="m-0 text-[14px] font-semibold">{title}</h3>
      {right}
    </div>
  );
}

export function ProgressBar({
  pct,
  color = "#0e5b54",
  height = 6,
  track = "#eef0f1",
}: {
  pct: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded"
      style={{ height, background: track, borderRadius: 4 }}
    >
      <div
        style={{ height: "100%", borderRadius: 4, background: color, width: `${pct}%` }}
      />
    </div>
  );
}
