import { db } from "@/lib/db";
import { loginAs } from "@/app/actions";
import { Monogram } from "@/components/Icons";

const ROLE_DESC: Record<string, string> = {
  LO: "Leads, discovery, term sheets",
  PROC: "Docs, conditions, closings, servicing",
  UW: "Credit decisions, memos, draws",
  CM: "Investors, allocations, distributions",
  PRIN: "Exceptions, tier-2/3 approvals, config",
  ADMIN: "Everything",
};

export default async function LoginPage() {
  const users = await db.user.findMany({ where: { active: true }, orderBy: { role: "asc" } });

  return (
    <div className="min-h-screen flex">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] portal-hero text-white p-10">
        <div className="flex items-center gap-3">
          <Monogram size={34} />
          <span className="leading-none">
            <span className="block font-serif text-[20px] font-semibold tracking-tight">Lendrock Capital</span>
            <span className="block font-mono text-[9.5px] text-white/40 uppercase tracking-[0.22em] mt-1">Deal Operating System</span>
          </span>
        </div>

        <div>
          <p className="font-serif text-[34px] leading-[1.15] font-semibold tracking-tight max-w-md text-balance">
            Five people. Four pathways. One pipeline that runs itself.
          </p>
          <p className="text-[14px] text-white/60 mt-4 max-w-sm leading-relaxed">
            Intake to payoff — automated chasing, gated stages, capital allocation, and compliance in code.
          </p>
        </div>

        <div className="flex items-center gap-5 font-mono text-[10.5px] text-white/35 uppercase tracking-[0.14em]">
          <span>HM · BB · WC · SBA</span>
          <span className="w-1 h-1 rounded-full bg-white/25" />
          <span>Business-purpose only</span>
        </div>
      </div>

      {/* sign-in panel */}
      <div className="flex-1 flex items-center justify-center bg-page px-6">
        <div className="w-full max-w-sm animate-fadeUp">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <Monogram size={30} />
            <span className="font-serif text-[18px] font-semibold text-ink tracking-tight">Lendrock Capital</span>
          </div>

          <p className="label mb-1">Sign in</p>
          <h1 className="h-serif text-[24px] font-semibold mb-5">Who&apos;s working?</h1>

          <div className="grid gap-2">
            {users.map((u) => (
              <form key={u.id} action={loginAs}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="w-full flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3 hover:border-brand hover:shadow-raised transition-all text-left group">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-tint text-brand font-sans text-[12px] font-bold group-hover:bg-brand group-hover:text-white transition-colors">
                    {u.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-ink">{u.name}</span>
                    <span className="block text-2xs text-faint mt-px">{ROLE_DESC[u.role] ?? ""}</span>
                  </span>
                  <span className="kcode">{u.role}</span>
                </button>
              </form>
            ))}
          </div>

          <p className="text-2xs text-faint mt-6 leading-relaxed">
            Dev-mode auth — pick a seat to explore. Production swaps this seam for Clerk: TOTP for the team,
            magic links for borrowers and investors.
          </p>
        </div>
      </div>
    </div>
  );
}
