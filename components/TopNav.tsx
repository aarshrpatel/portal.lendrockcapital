"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV: { href: string; label: string; match: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", match: ["/dashboard"] },
  { href: "/pipeline", label: "Pipeline", match: ["/pipeline", "/clients"] },
  { href: "/intake", label: "Live intake", match: ["/intake"] },
  { href: "/tasks", label: "Tasks", match: ["/tasks"] },
  { href: "/documents", label: "Documents", match: ["/documents", "/borrower"] },
  { href: "/reports", label: "Reports", match: ["/reports"] },
];

const NOTIFS = [
  {
    text: "Anjali logged a call with Meena Shah — ready for consult",
    when: "12m ago",
    href: "/clients/meena",
  },
  {
    text: "Rakesh Patel uploaded 2 documents — file now complete",
    when: "2h ago",
    href: "/clients/rakesh",
  },
  {
    text: "Dilip Desai — lender requested updated rent roll",
    when: "4h ago",
    href: "/clients/dilip",
  },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const isActive = (m: string[]) =>
    m.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-[60px] max-w-shell items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-[26px]">
          <Link href="/dashboard" className="flex cursor-pointer items-center gap-[10px]">
            <div
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand font-guj text-[17px] font-bold text-white"
              style={{ boxShadow: "0 1px 2px rgba(14,91,84,.4)" }}
            >
              સે
            </div>
            <div className="leading-none">
              <div className="font-serif text-[21px] font-semibold -tracking-[0.01em]">
                Setu
              </div>
              <div className="mt-[2px] text-[9.5px] uppercase tracking-[0.13em] text-faint">
                Loan Advisory
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-[2px]">
            {NAV.map((item) => {
              const active = isActive(item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-[13px] py-[7px] text-[13px] transition-colors ${
                    active
                      ? "bg-brand-tint font-semibold text-brand-hover"
                      : "font-medium text-[#5b6470] hover:bg-[#f1f3f4] hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex h-[34px] w-[210px] items-center rounded-lg border border-line bg-[#f2f4f5] px-[10px]">
            <span className="text-[13px] text-[#a9b0b6]">⌕</span>
            <input
              placeholder="Search clients, files…"
              className="w-full border-0 bg-transparent pl-[7px] text-[12.5px] text-ink outline-none"
            />
          </div>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative h-[34px] w-[34px] rounded-lg border border-line bg-white text-[15px] text-[#5b6470] hover:bg-page"
              aria-label="Notifications"
            >
              ⌁
              <span className="absolute right-[7px] top-[6px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#dc2626]" />
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 top-[42px] z-50 w-[330px] animate-fadeUp rounded-[11px] border border-line bg-white py-[7px]"
                style={{ boxShadow: "0 12px 28px rgba(16,24,40,.16)" }}
              >
                <div className="px-[15px] pb-[6px] pt-[8px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
                  Unread
                </div>
                {NOTIFS.map((n) => (
                  <button
                    key={n.text}
                    onClick={() => {
                      setNotifOpen(false);
                      router.push(n.href);
                    }}
                    className="flex w-full cursor-pointer gap-[10px] px-[15px] py-[9px] text-left hover:bg-[#f7f8f9]"
                  >
                    <span className="mt-[6px] h-[6px] w-[6px] flex-[0_0_6px] rounded-full bg-brand" />
                    <div>
                      <div className="text-[12.5px] leading-[1.4] text-body">{n.text}</div>
                      <div className="mt-[2px] text-[11px] text-[#a9b0b6]">{n.when}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-[9px] pl-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[12px] font-semibold text-white">
              HP
            </div>
            <div className="leading-[1.2]">
              <div className="text-[12.5px] font-semibold">Hitesh Patel</div>
              <div className="text-[10.5px] text-faint">Owner · Admin</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
