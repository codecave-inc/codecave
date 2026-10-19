import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { IconSignOut } from "./Icons";
import { Logo } from "./Logo";
import { ThemeSwitch } from "./ThemeSwitch";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-sm px-3 py-2 text-sm font-semibold hover:bg-bg-alt ${isActive ? "text-primary" : "text-ink-2"}`;

/** Header and navigation for every signed-in page. */
export function AppShell() {
  const { signOut } = useAuthActions();
  const catalog = useQuery(api.courses.catalog, {});
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const focused = catalog?.filter((c) => c.type === "focused") ?? [];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
          <Link to="/" aria-label="CodeCave Academy home"><Logo className="h-8" /></Link>
          <nav aria-label="Main" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
            <NavLink to="/" end className={navCls}>Home</NavLink>
            <div className="relative" ref={menu}>
              <button className="rounded-sm px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-bg-alt" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
                Professional courses <span aria-hidden="true">▾</span>
              </button>
              {open && (
                <div role="menu" className="absolute left-0 z-20 mt-1 w-72 rounded-md border border-line bg-surface p-1 shadow-lg">
                  {focused.length === 0 && <p className="px-3 py-2 text-sm text-muted">Courses are on the way.</p>}
                  {focused.map((c) => (
                    <Link key={c._id} role="menuitem" to={`/courses/${c.slug}`} onClick={() => setOpen(false)} className="flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm hover:bg-bg-alt">
                      <span className="font-semibold">{c.title}</span>
                      {c.status === "coming_soon" && <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs text-ink-2">Coming soon</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NavLink to="/utility" className={navCls}>AI utility courses</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeSwitch className="hidden md:inline-flex" />
            <button className="btn btn-outline !px-3 !py-2 text-sm" onClick={() => void signOut()}>
              <IconSignOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
