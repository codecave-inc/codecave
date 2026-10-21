import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link } from "react-router-dom";
import { CourseCard } from "../components/CourseCard";
import { Spinner } from "../components/ui";

/** Home. The full dashboard (continue learning, streak, recommendations) arrives in a later phase. */
export default function Dashboard() {
  const me = useQuery(api.profiles.me, {});
  const catalog = useQuery(api.courses.catalog, {});
  const resume = useQuery(api.learn.continueLearning, {});
  const first = me?.name?.split(" ")[0];
  const focused = catalog?.filter((c) => c.type === "focused");

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[.2em] text-primary">CodeCave Academy</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{first ? `Welcome, ${first}.` : "Welcome."}</h1>
      <p className="mt-3 max-w-2xl text-ink-2">Pick a course to see what's inside. The first lesson of every professional course is free.</p>

      {me?.staffRole && (
        <p className="mt-4 max-w-2xl rounded-sm border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          You're signed in with a staff account ({me.staffRole}).
        </p>
      )}

      {resume && (
        <Link to={`/courses/${resume.courseSlug}/lessons/${resume.lessonId}`} className="mt-8 flex items-center justify-between gap-4 rounded-md border border-primary/30 bg-primary/10 px-5 py-4 hover:border-primary">
          <span>
            <span className="block font-mono text-xs uppercase tracking-[.2em] text-primary">{resume.complete ? "Watch again" : "Continue where you left off"}</span>
            <span className="mt-1 block font-semibold">Lesson {resume.lessonNumber}: {resume.lessonTitle}</span>
            <span className="text-sm text-ink-2">{resume.courseTitle}{resume.complete ? "" : ` · ${Math.round(resume.pct)}% watched`}</span>
          </span>
          <span aria-hidden="true" className="text-primary">→</span>
        </Link>
      )}

      <h2 className="mt-10 text-xl">Professional courses</h2>
      {focused === undefined ? (
        <div className="mt-6 text-primary"><Spinner /></div>
      ) : focused.length === 0 ? (
        <p className="mt-4 text-ink-2">The first course is being prepared. Check back soon.</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">{focused.map((c) => <CourseCard key={c._id} c={c} />)}</div>
      )}
    </main>
  );
}
