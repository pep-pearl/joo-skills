import { useProfileEditor } from "../model/useProfileEditor";
export function ProfileEditorPage() {
  const { save } = useProfileEditor();
  return <button onClick={() => save({ displayName: "Pearl" })}>저장</button>;
}
