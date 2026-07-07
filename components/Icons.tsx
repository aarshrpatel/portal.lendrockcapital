// Hand-drawn 16px geometric icon set — 1.5px strokes, currentColor.
// One visual voice for the whole portal; no icon library dependency.

type IconProps = { size?: number; className?: string };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export const IconDay = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <rect x="2" y="3" width="12" height="11" rx="1.5" />
    <path d="M2 6.5h12M5.5 3V1.5M10.5 3V1.5" />
    <path d="M5 10l1.8 1.8L10.5 8.3" />
  </svg>
);

export const IconLeads = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M2 3h12l-4.5 5.2v4.3l-3 1.5V8.2L2 3z" />
  </svg>
);

export const IconPipeline = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <rect x="1.5" y="2.5" width="3.4" height="11" rx="1" />
    <rect x="6.3" y="2.5" width="3.4" height="7.5" rx="1" />
    <rect x="11.1" y="2.5" width="3.4" height="5" rx="1" />
  </svg>
);

export const IconApprove = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="8" cy="6.5" r="4.5" />
    <path d="M6.2 6.5l1.3 1.3 2.4-2.4M5 10.5L4 14.5l4-1.6 4 1.6-1-4" />
  </svg>
);

export const IconDraw = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M8 1.8s4.4 4.6 4.4 8a4.4 4.4 0 11-8.8 0c0-3.4 4.4-8 4.4-8z" />
    <path d="M6.3 9.8a1.8 1.8 0 001.7 1.6" />
  </svg>
);

export const IconInvestor = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 1.8V8l4.4 4.4" />
  </svg>
);

export const IconShield = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M8 1.8l5 1.8v4c0 3.4-2.1 5.6-5 6.9-2.9-1.3-5-3.5-5-6.9v-4l5-1.8z" />
    <path d="M5.8 7.8l1.6 1.6 2.8-3" />
  </svg>
);

export const IconChart = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M2 13.5h12M3.5 13.5V9M7 13.5V5.5M10.5 13.5V7.5M14 13.5V3.5" />
  </svg>
);

export const IconDoc = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M4 1.5h5.5L13 5v9.5H4V1.5z" />
    <path d="M9.5 1.5V5H13M6 8.5h4M6 11h4" />
  </svg>
);

export const IconGear = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M2.5 5.5h11M2.5 10.5h11" />
    <circle cx="6" cy="5.5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrow = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M3 8h10M9.5 4.5L13 8l-3.5 3.5" />
  </svg>
);

export const IconClock = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4.8V8l2.2 2.2" />
  </svg>
);

export const IconAlert = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M8 2L15 13.5H1L8 2z" />
    <path d="M8 6.5v3.2M8 11.8v.2" />
  </svg>
);

export const IconUpload = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M8 10.5V2.5M4.8 5.5L8 2.3l3.2 3.2M2.5 13.5h11" />
  </svg>
);

export const IconInbox = ({ size = 16, className }: IconProps) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M2 8.5L4 3h8l2 5.5V13H2V8.5z" />
    <path d="M2 8.5h3.5c0 1.2 1 2.2 2.5 2.2s2.5-1 2.5-2.2H14" />
  </svg>
);

// Lendrock monogram — an "L" cut like a ledger corner.
export const Monogram = ({ size = 28, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
    <rect width="28" height="28" rx="6" fill="#1E5C44" />
    <path d="M9 6.5v12h10.5" stroke="#F4F4EF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M9 6.5v12h10.5" stroke="#6FBF9A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.0" />
    <circle cx="19.5" cy="9" r="1.8" fill="#6FBF9A" />
  </svg>
);
