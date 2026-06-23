import { getTasks } from "@/lib/data";
import { TaskList } from "@/components/TaskList";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await getTasks();
  return <TaskList tasks={tasks} />;
}
