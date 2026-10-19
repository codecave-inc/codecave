import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { IconCheck, IconSignOut } from "../components/Icons";
import { Logo } from "../components/Logo";
import { ThemeSwitch } from "../components/ThemeSwitch";

const BUILT = [
  "Create an account with email verification",
  "Sign in, reset a password, stay signed in",
  "Age and guardian-permission checks",
  "Staff and student accounts kept strictly apart",
];
const NEXT = [
  "Course catalog and the AI Website Development course",
  "The lesson page with video, notes and Kody",
  "Assessments and certificates",
];

/** Placeholder home. The real dashboard (continue learning, streak, recommendations) arrives in a later phase. */
export default function Dashboard() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.profiles.me, {});
  const first = me?.name?.split(" ")[0];

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Logo className="h-8" />
          <div className="flex items-center gap-3">
            <ThemeSwitch className="hidden sm:inline-flex" />
            <button className="btn btn-outline !px-3 !py-2 text-sm" onClick={() => void signOut()}>
              <IconSignOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <p className="font-mono text-xs uppercase tracking-[.2em] text-primary">CodeCave Academy</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{first ? `Welcome, ${first}.` : "Welcome."}</h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          You're in. The learning experience is being built right now, and your account is ready for it.
        </p>

        {me?.staffRole && (
          <p className="mt-4 max-w-2xl rounded-sm border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            You're signed in with a staff account ({me.staffRole}).
          </p>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="rounded-md border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg">Ready</h2>
            <ul className="mt-4 space-y-3">
              {BUILT.map((t) => (
                <li key={t} className="flex gap-3 text-sm">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-lg">Coming next</h2>
            <ul className="mt-4 space-y-3">
              {NEXT.map((t) => (
                <li key={t} className="flex gap-3 text-sm text-ink-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-2" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <ThemeSwitch className="mt-8 sm:hidden" />
      </main>
    </div>
  );
}
