import Link from "next/link";
import { db } from "@/lib/db";
import { logout } from "@/app/actions";
import type { User } from "@prisma/client";
import { Monogram } from "@/components/Icons";
import SidebarNav from "@/components/SidebarNav";

export default async function Sidebar({ user }: { user: User }) {
  const [myTasks, pendingSignoffs] = await Promise.all([
    db.task.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, ownerRole: user.role === "ADMIN" ? undefined : user.role },
    }),
    db.approvalSignoff.count({
      where: { decision: "PENDING", approverRole: user.role === "ADMIN" ? undefined : user.role },
    }),
  ]);
  const badges: Record<string, number> = { "/": myTasks, "/approvals": pendingSignoffs };

  return (
    <aside className="w-[212px] shrink-0 bg-brand-deep flex flex-col sticky top-0 h-screen">
      <Link href="/" className="flex items-center gap-2.5 px-4 pt-5 pb-3">
        <Monogram size={30} />
        <span className="leading-none">
          <span className="block font-serif text-[17px] font-semibold text-white tracking-tight">Lendrock</span>
          <span className="block font-mono text-[9px] text-white/40 uppercase tracking-[0.22em] mt-1">Deal OS</span>
        </span>
      </Link>

      <SidebarNav badges={badges} />

      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#6FBF9A]/20 text-[#8fd4b3] font-sans text-[11px] font-bold">
            {user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[12.5px] font-medium text-white truncate">{user.name}</p>
            <p className="font-mono text-[10px] text-white/40 mt-0.5">{user.role}</p>
          </div>
          <form action={logout}>
            <button className="text-[10px] font-semibold uppercase tracking-wider text-white/35 hover:text-white transition-colors" title="Switch user">
              Switch
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
