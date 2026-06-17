import { updateProfile } from "../api/profileApi";
import { queryClient } from "@acme/query";
export function useProfileEditor() {
  return { save: async (input: { displayName: string }) => {
    await updateProfile(input);
    await queryClient.invalidateQueries(["viewer-profile"]);
  }};
}
