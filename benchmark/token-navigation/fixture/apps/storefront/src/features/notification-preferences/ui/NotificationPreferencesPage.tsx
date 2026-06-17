import { useNotificationPreferenceMutation } from "../model/useNotificationPreferenceMutation";
export function NotificationPreferencesPage() {
  const { toggleEmail } = useNotificationPreferenceMutation();
  return <input type="checkbox" onChange={(e) => void toggleEmail(e.target.checked)} />;
}
