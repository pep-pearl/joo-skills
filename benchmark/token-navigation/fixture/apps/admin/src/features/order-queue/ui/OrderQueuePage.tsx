import { useAssigneeFilter } from "../model/useAssigneeFilter";
export function OrderQueuePage() {
  const { assignee, setAssignee } = useAssigneeFilter();
  return <select value={assignee} onChange={(e) => setAssignee(e.target.value)} />;
}
