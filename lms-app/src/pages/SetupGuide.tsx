import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { friendlyError } from "../lib/errors";
import { Alert, Spinner } from "../components/ui";
import { IconCheck } from "../components/Icons";
import { NotFoundBody } from "./Placeholders";

export default function SetupGuide() {
  const { slug = "" } = useParams();
  const guide = useQuery(api.courses.setupGuide, { slug });
  const course = useQuery(api.courses.bySlug, { slug });
  const toggle = useMutation(api.courses.toggleSetupItem);
  const [err, setErr] = useState<string | null>(null);

  if (guide === undefined || course === undefined) return <div className="grid min-h-[50vh] place-items-center text-primary"><Spinner className="h-8 w-8" /></div>;
  if (guide === null || course === null) return <NotFoundBody />;

  const done = new Set(guide.doneIds);
  const doneCount = guide.items.filter((i) => done.has(i.id)).length;
  const pct = guide.items.length ? Math.round((doneCount / guide.items.length) * 100) : 0;

  async function tick(id: string, value: boolean) {
    setErr(null);
    try {
      await toggle({ courseId: course!._id, itemId: id, done: value });
    } catch (e) {
      setErr(friendlyError(e, "We couldn't save that. Please try again."));
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link to={`/courses/${slug}`} className="link text-sm">← {guide.courseTitle}</Link>
      <h1 className="mt-6 text-3xl">Setup guide</h1>
      <p className="mt-3 text-ink-2">Have these ready before lesson 1. Tick each one off as you go. We keep this page up to date when tools change.</p>
      <div className="mt-6" aria-label={`${doneCount} of ${guide.items.length} done`}>
        <div className="h-2 overflow-hidden rounded-full bg-bg-alt"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 font-mono text-xs text-muted">{doneCount} of {guide.items.length} done</p>
      </div>
      {err && <div className="mt-4"><Alert>{err}</Alert></div>}
      {guide.items.length === 0 && <p className="mt-8 text-ink-2">There's nothing to set up for this course yet.</p>}
      <ul className="mt-6 space-y-3">
        {guide.items.map((it) => {
          const on = done.has(it.id);
          return (
            <li key={it.id}>
              <label className={`flex cursor-pointer gap-4 rounded-md border bg-surface p-5 shadow-sm ${on ? "border-success/50" : "border-line"}`}>
                <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => void tick(it.id, e.target.checked)} />
                <span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm border peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${on ? "border-success bg-success text-on-primary" : "border-line"}`}>
                  {on && <IconCheck className="h-4 w-4" />}
                </span>
                <span>
                  <span className={`block font-semibold ${on ? "text-ink-2 line-through" : ""}`}>{it.title}</span>
                  {it.detail && <span className="mt-1 block text-sm text-ink-2">{it.detail}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
