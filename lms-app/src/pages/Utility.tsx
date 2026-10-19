import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CourseCard } from "../components/CourseCard";
import { Spinner } from "../components/ui";

export default function Utility() {
  const catalog = useQuery(api.courses.catalog, {});
  const [q, setQ] = useState("");
  const list = (catalog ?? []).filter((c) => c.type === "utility" && `${c.title} ${c.tagline ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[.2em] text-primary">CodeCave Academy</p>
      <h1 className="mt-2 text-3xl">AI utility courses</h1>
      <p className="mt-3 max-w-2xl text-ink-2">Short, practical courses on using AI for everyday work. Pick one and get a useful result in an afternoon.</p>
      <div className="mt-6 max-w-md">
        <label htmlFor="utility-search" className="sr-only">Search utility courses</label>
        <input id="utility-search" className="input" type="search" placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {catalog === undefined ? (
        <div className="mt-10 text-primary"><Spinner /></div>
      ) : list.length === 0 ? (
        <p className="mt-10 text-ink-2">{q ? "No courses match that search." : "The first utility courses are being prepared. Check back soon."}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">{list.map((c) => <CourseCard key={c._id} c={c} />)}</div>
      )}
    </main>
  );
}
