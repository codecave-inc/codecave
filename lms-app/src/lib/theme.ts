export type Theme = "normal" | "bright" | "dark";
export const THEMES: { id: Theme; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "bright", label: "Bright" },
  { id: "dark", label: "Dark" },
];

export function getTheme(): Theme {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "bright" || t === "dark" ? t : "normal";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("cc-theme", theme);
  } catch {
    /* private mode / blocked storage: the theme just won't persist */
  }
}
