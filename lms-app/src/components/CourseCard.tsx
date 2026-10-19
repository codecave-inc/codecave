import { Link } from "react-router-dom";
import { formatDuration, plural } from "../lib/format";

type Card = {
  slug: string; title: string; status: "published" | "draft" | "coming_soon"; tagline: string | null;
  lessonCount: number; moduleCount: number; totalSec: number; type: "focused" | "utility";
};

export function CourseCard({ c }: { c: Card }) {
  const soon = c.status === "coming_soon";
  return (
    <Link to={`/courses/${c.slug}`} className="group block rounded-md border border-line bg-surface p-6 shadow-sm transition hover:border-primary hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg group-hover:text-primary">{c.title}</h3>
        {soon && <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Coming soon</span>}
      </div>
      {c.tagline && <p className="mt-2 text-sm text-ink-2">{c.tagline}</p>}
      {!soon && (
        <p className="mt-4 font-mono text-xs text-muted">
          {c.type === "focused" && c.moduleCount > 0 ? `${plural(c.moduleCount, "module")} · ` : ""}{plural(c.lessonCount, "lesson")}
          {c.totalSec > 0 ? ` · ${formatDuration(c.totalSec)}` : ""}
        </p>
      )}
    </Link>
  );
}
