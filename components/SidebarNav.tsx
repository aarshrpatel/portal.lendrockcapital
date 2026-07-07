"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDay, IconLeads, IconPipeline, IconApprove, IconDraw, IconInvestor,
  IconShield, IconChart, IconDoc, IconGear,
} from "@/components/Icons";

const GROUPS = [
  {
    title: "Originate",
    items: [
      { href: "/", label: "My Day", icon: IconDay },
      { href: "/leads", label: "Leads", icon: IconLeads },
      { href: "/pipeline", label: "Pipeline", icon: IconPipeline },
    ],
  },
  {
    title: "Decide",
    items: [
      { href: "/approvals", label: "Approvals", icon: IconApprove },
      { href: "/draws", label: "Draws", icon: IconDraw },
    ],
  },
  {
    title: "Capital",
    items: [{ href: "/investors", label: "Investors", icon: IconInvestor }],
  },
  {
    title: "Oversee",
    items: [
      { href: "/compliance", label: "Compliance", icon: IconShield },
      { href: "/reports", label: "Reports", icon: IconChart },
    ],
  },
  {
    title: "Library",
    items: [
      { href: "/templates", label: "Templates", icon: IconDoc },
      { href: "/settings", label: "Settings", icon: IconGear },
    ],
  },
];

export default function SidebarNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || path.startsWith(href + "?");

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="nav-group">{g.title}</p>
          <div className="grid gap-0.5">
            {g.items.map((item) => {
              const Icon = item.icon;
              const badge = badges[item.href] ?? 0;
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? "active" : ""}`}>
                  <Icon size={15} className="shrink-0 opacity-80" />
                  {item.label}
                  {badge > 0 ? (
                    <span className="ml-auto font-mono text-[10px] font-semibold bg-[#6FBF9A]/20 text-[#8fd4b3] rounded-full px-1.5 py-px">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
