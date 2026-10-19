import { useState } from "react";
import { THEMES, getTheme, setTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import { IconPalette } from "./Icons";

export function ThemeSwitch({ className = "" }: { className?: string }) {
  const [theme, set] = useState<Theme>(getTheme());
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <IconPalette className="h-4 w-4 text-muted" />
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-sm border border-line bg-surface p-0.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={theme === t.id}
            onClick={() => { setTheme(t.id); set(t.id); }}
            className={`rounded-[.4rem] px-2.5 py-1 text-xs font-semibold transition ${
              theme === t.id ? "bg-primary text-on-primary" : "text-ink-2 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
