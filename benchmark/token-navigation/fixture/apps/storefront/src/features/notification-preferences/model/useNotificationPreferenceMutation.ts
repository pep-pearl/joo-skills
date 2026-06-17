import { updateNotificationPreferences } from "../api/notificationPreferencesApi";
export function useNotificationPreferenceMutation() {
  return { toggleEmail: (enabled: boolean) => updateNotificationPreferences({ email: enabled }) };
}
