import { notFound } from "next/navigation";
import { getCase } from "@/lib/data";
import { BorrowerView } from "@/components/BorrowerView";

export const dynamic = "force-dynamic";

export default async function BorrowerPage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) notFound();
  return <BorrowerView c={c} />;
}
