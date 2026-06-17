export const queryClient = {
  async invalidateQueries(key: readonly string[]) { return key; }
};
