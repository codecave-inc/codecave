/** Colours come from CSS variables (src/index.css) so the three themes — Normal, Bright, Dark — swap without rebuilding. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        "bg-alt": v("bg-alt"),
        surface: v("surface"),
        ink: v("ink"),
        "ink-2": v("ink-2"),
        muted: v("muted"),
        line: v("line"),
        primary: v("primary"),
        "primary-2": v("primary-2"),
        "on-primary": v("on-primary"),
        danger: v("danger"),
        success: v("success"),
        navy: v("navy"),
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { sm: ".6rem", md: ".85rem", lg: "1.1rem" },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,.06), 0 1px 1px rgba(15,23,42,.04)",
        md: "0 4px 10px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.05)",
        lg: "0 12px 28px rgba(15,23,42,.12), 0 2px 6px rgba(15,23,42,.06)",
      },
    },
  },
  plugins: [],
};
