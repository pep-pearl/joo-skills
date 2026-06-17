export type Theme = "light" | "dark";
let theme: Theme = "light";
export const themeStore = { get: () => theme, set: (next: Theme) => { theme = next; } };
