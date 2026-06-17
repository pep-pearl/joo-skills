export function useAssigneeFilter() {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  return {
    assignee: params.get("assignee") ?? "all",
    setAssignee(value: string) { params.set("assignee", value); }
  };
}
