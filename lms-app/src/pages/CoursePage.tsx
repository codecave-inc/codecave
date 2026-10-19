import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../lib/errors";
import { formatDuration, plural } from "../lib/format";
import { Alert, Spinner } from "../components/ui";
import { NotFoundBody } from "./Placeholders";

type Lesson = { _id: string; number: number; title: string; summary: string; durationSec: number; isFreePreview: boolean; status: "published" | "draft" | "coming_soon" };

function LessonRow({ l }: { l: Lesson }) {
  return (
    <li className="flex items-start gap-4 border-t border-line px-5 py-3 first:border-t-0">
      <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-muted">{l.number}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{l.title}</p>
        {l.summary && <p className="mt-0.5 text-sm text-ink-2">{l.summary}</p>}
      </div>
      <div className="shrink-0 text-right text-xs text-muted">
        {l.status === "coming_soon" ? <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">Coming soon</span> : formatDuration(l.durationSec)}
        {l.isFreePreview && l.status !== "coming_soon" && <p className="mt-1 font-semibold text-success">Free</p>}
      </div>
    </li>
  );
}

function Waitlist({ courseId }: { courseId: Id<"courses"> }) {
  const join = useMutation(api.courses.joinWaitlist);
  const me = useQuery(api.profiles.me, {});
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const address = email || me?.email || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setState("busy");
    try {
      await join({ courseId, email: address });
      setState("done");
    } catch (e2) {
      setErr(friendlyError(e2, "We couldn't add you just now. Please try again."));
      setState("idle");
    }
  }

  if (state === "done") return <Alert kind="success">You're on the list. We'll email you the day this course opens.</Alert>;
  return (
    <form onSubmit={submit} className="max-w-md space-y-3">
      <label htmlFor="wl-email" className="block text-sm font-semibold">Get an email when it opens</label>
      <div className="flex gap-2">
        <input id="wl-email" className="input" type="email" required value={address} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <button className="btn btn-primary whitespace-nowrap" disabled={state === "busy"}>{state === "busy" ? "Joining…" : "Notify me"}</button>
      </div>
      {err && <Alert>{err}</Alert>}
    </form>
  );
}

export default function CoursePage() {
  const { slug = "" } = useParams();
  const course = useQuery(api.courses.bySlug, { slug });

  if (course === undefined) return <div className="grid min-h-[50vh] place-items-center text-primary"><Spinner className="h-8 w-8" /></div>;
  if (course === null) return <NotFoundBody />;

  const all: Lesson[] = [...course.modules.flatMap((m) => m.lessons), ...course.lessons];
  const total = all.filter((l) => l.status === "published").reduce((s, l) => s + l.durationSec, 0);
  const soon = course.status === "coming_soon";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link to={course.type === "focused" ? "/" : "/utility"} className="link text-sm">← {course.type === "focused" ? "Home" : "AI utility courses"}</Link>
      <p className="mt-6 font-mono text-xs uppercase tracking-[.2em] text-primary">{course.type === "focused" ? "Professional course" : "AI utility course"}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{course.title}</h1>
      {course.tagline && <p className="mt-3 max-w-2xl text-lg text-ink-2">{course.tagline}</p>}
      <p className="mt-5 max-w-3xl whitespace-pre-line text-ink">{course.description}</p>

      {soon ? (
        <section className="mt-8 rounded-md border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg">Coming soon</h2>
          <p className="mb-4 mt-1 text-sm text-ink-2">We're still building this course. Join the waitlist and you'll hear first.</p>
          <Waitlist courseId={course._id} />
        </section>
      ) : (
        <>
          <p className="mt-5 font-mono text-xs text-muted">
            {course.modules.length > 0 ? `${plural(course.modules.length, "module")} · ` : ""}{plural(all.length, "lesson")}{total > 0 ? ` · ${formatDuration(total)}` : ""}
          </p>
          {course.hasSetupGuide && (
            <Link to={`/courses/${course.slug}/setup`} className="mt-6 flex items-center justify-between gap-4 rounded-md border border-primary/30 bg-primary/10 px-5 py-4 hover:border-primary">
              <span><span className="block font-semibold">Start with the setup guide</span><span className="text-sm text-ink-2">The accounts and tools to have ready before lesson 1.</span></span>
              <span aria-hidden="true" className="text-primary">→</span>
            </Link>
          )}
          <h2 className="mt-10 text-xl">What's inside</h2>
          <div className="mt-4 space-y-5">
            {course.modules.map((m) => (
              <section key={m._id} className="overflow-hidden rounded-md border border-line bg-surface shadow-sm">
                <div className="bg-bg-alt px-5 py-4">
                  <h3 className="text-base">Module {m.number}: {m.title}</h3>
                  {m.outcome && <p className="mt-1 text-sm text-ink-2">{m.outcome}</p>}
                </div>
                <ul>{m.lessons.map((l) => <LessonRow key={l._id} l={l} />)}</ul>
              </section>
            ))}
            {course.lessons.length > 0 && (
              <section className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"><ul>{course.lessons.map((l) => <LessonRow key={l._id} l={l} />)}</ul></section>
            )}
            {all.length === 0 && <p className="text-ink-2">Lessons are being added. Check back soon.</p>}
          </div>
          <p className="mt-6 text-sm text-muted">Watching lessons opens in the next update.</p>
        </>
      )}
    </main>
  );
}
