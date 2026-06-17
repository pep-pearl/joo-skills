let viewerId: string | null = "viewer-1";
export const sessionStore = {
  getViewerId: () => viewerId,
  clear: () => { viewerId = null; }
};
