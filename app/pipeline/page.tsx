import { getAllCases } from "@/lib/data";
import { PipelineBoard } from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const cases = await getAllCases();
  return <PipelineBoard cases={cases} />;
}
