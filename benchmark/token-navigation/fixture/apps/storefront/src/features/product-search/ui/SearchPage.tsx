import { useSearchUrlState } from "../model/useSearchUrlState";
export function SearchPage() {
  const { category, setCategory } = useSearchUrlState();
  return <button onClick={() => setCategory("shoes")}>{category}</button>;
}
