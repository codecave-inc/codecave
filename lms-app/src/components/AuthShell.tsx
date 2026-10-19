import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { IconBadge, IconCode, IconSparkle } from "./Icons";
import { Logo } from "./Logo";
import { ThemeSwitch } from "./ThemeSwitch";

const POINTS = [
  { icon: IconCode, title: "Build real things", text: "Project-based lessons that end with something you can show." },
  { icon: IconSparkle, title: "Learn beside an AI partner", text: "Kody explains, hints and challenges you while you watch." },
  { icon: IconBadge, title: "Prove it", text: "Practical assessments and verifiable certificates." },
];

/** Split layout: brand panel (hidden on small screens) + the form. */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-navy text-slate-100 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* subtle blueprint grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.07]"
          style={{ backgroundImage: "linear-gradient(#7DD3FC 1px,transparent 1px),linear-gradient(90deg,#7DD3FC 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-primary-2/20 blur-3xl" />
        <Link to="/" className="relative w-fit rounded-sm bg-white px-3 py-2 shadow-md"><Logo className="h-9" /></Link>
        <div className="relative max-w-md">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-primary-2">CodeCave Academy</p>
          <h2 className="mt-4 text-4xl leading-[1.1] text-white">Organize. Build. Succeed. with AI.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-white/15 bg-white/5 text-primary-2">
                  <Icon />
                </span>
                <span>
                  <span className="block font-semibold text-white">{title}</span>
                  <span className="block text-sm text-slate-300">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} CodeCave Inc.</p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:invisible"><Logo className="h-8" /></Link>
          <ThemeSwitch />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rise">
            <h1 className="text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-ink-2">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-ink-2">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
