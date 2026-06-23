import { getDocCollecting } from "@/lib/data";
import { DocumentCenter } from "@/components/DocumentCenter";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const cases = await getDocCollecting();
  return <DocumentCenter cases={cases} />;
}
