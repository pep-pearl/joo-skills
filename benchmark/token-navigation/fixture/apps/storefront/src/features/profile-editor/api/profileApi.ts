export async function updateProfile(input: { displayName: string }) {
  return { id: "viewer", ...input };
}
