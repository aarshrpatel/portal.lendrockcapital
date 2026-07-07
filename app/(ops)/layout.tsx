import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1240px] mx-auto px-6 py-6 animate-fadeUp">{children}</div>
      </main>
    </div>
  );
}
