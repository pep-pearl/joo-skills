export function useSearchUrlState() {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  return {
    category: params.get("category") ?? "all",
    setCategory(value: string) { params.set("category", value); }
  };
}
