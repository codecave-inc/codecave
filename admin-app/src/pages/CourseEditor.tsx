import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import Modal from "../components/Modal";
import LessonEditor from "./LessonEditor";
import { errorText } from "../lib/errorText";

type Setup = { id: string; title: string; detail: string };

export default function CourseEditor({ courseId, canDelete, onBack }: { courseId: Id<"courses">; canDelete: boolean; onBack: () => void }) {
  const tree = useQuery(api.courseAdmin.getCourseTree, { courseId });
  const updateCourse = useMutation(api.courseAdmin.updateCourse);
  const deleteCourse = useMutation(api.courseAdmin.deleteCourse);
  const createModule = useMutation(api.courseAdmin.createModule);
  const updateModule = useMutation(api.courseAdmin.updateModule);
  const deleteModule = useMutation(api.courseAdmin.deleteModule);
  const reorderModules = useMutation(api.courseAdmin.reorderModules);
  const createLesson = useMutation(api.courseAdmin.createLesson);
  const deleteLesson = useMutation(api.courseAdmin.deleteLesson);
  const reorderLessons = useMutation(api.courseAdmin.reorderLessons);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [lessonId, setLessonId] = useState<Id<"lessons"> | null>(null);
  const [moduleModal, setModuleModal] = useState<Doc<"modules"> | "new" | null>(null);
  const [setup, setSetup] = useState<Setup[] | null>(null);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    }
  }

  if (tree === undefined) return <p className="muted">Loading…</p>;
  if (tree === null) return <div><button className="link-btn" onClick={onBack}>← All courses</button><p>That course no longer exists.</p></div>;
  const { course, modules, lessons } = tree;
  const setupItems = setup ?? course.setupGuide ?? [];
  const byOrder = <T extends { order: number }>(a: T[]) => [...a].sort((x, y) => x.order - y.order);
  const move = (ids: string[], i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return ids;
    const copy = [...ids];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };
  const mods = byOrder(modules);

  async function saveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(
      () => updateCourse({
        courseId, slug: String(f.get("slug")), title: String(f.get("title")), status: f.get("status") as "draft" | "published" | "coming_soon",
        tagline: String(f.get("tagline") || "") || undefined, description: String(f.get("description")),
        thumbnailUrl: String(f.get("thumbnailUrl") || "") || undefined, recommendedOrder: Number(f.get("recommendedOrder")),
        setupGuide: setupItems,
      }),
      "Course saved."
    );
  }

  const lessonRow = (l: Doc<"lessons">, ids: string[], i: number, moduleId?: Id<"modules">) => (
    <div className="tree-lesson" key={l._id}>
      <span className="tree-lesson__num">{l.number}</span>
      <button className="link-btn tree-lesson__title" style={{ textAlign: "left" }} onClick={() => setLessonId(l._id)}>{l.title}</button>
      {l.isFreePreview && <span className="pill">Free</span>}
      <span className={"pill pill--" + l.status}>{l.status.replace("_", " ")}</span>
      <span className="muted">{Math.round(l.durationSec / 60)} min</span>
      <button className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => run(() => reorderLessons({ courseId, moduleId, ids: move(ids, i, -1) as Id<"lessons">[] }))}>↑</button>
      <button className="icon-btn" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => run(() => reorderLessons({ courseId, moduleId, ids: move(ids, i, 1) as Id<"lessons">[] }))}>↓</button>
      {canDelete && <button className="link-btn link-btn--danger" onClick={() => confirm(`Delete lesson "${l.title}"? This can't be undone.`) && run(() => deleteLesson({ lessonId: l._id }))}>Delete</button>}
    </div>
  );

  const addLesson = (moduleId?: Id<"modules">) => {
    const title = prompt("Lesson title");
    if (title) run(() => createLesson({ courseId, moduleId, title }));
  };

  return (
    <div>
      <button className="link-btn" onClick={onBack}>← All courses</button>
      <div className="page-head" style={{ marginTop: ".5rem" }}>
        <h1>{course.title}</h1>
        <span className={"pill pill--" + course.status}>{course.status.replace("_", " ")}</span>
      </div>
      {msg && <div className={"notice" + (msg.ok ? "" : " notice--error")}>{msg.text}</div>}

      <form className="panel stack" onSubmit={saveDetails}>
        <h2>Course details</h2>
        <label>Title<input name="title" defaultValue={course.title} required maxLength={120} /></label>
        <label>Web address name<input name="slug" defaultValue={course.slug} required /></label>
        <label>Status
          <select name="status" defaultValue={course.status}>
            <option value="draft">Draft (only staff can see it)</option>
            <option value="coming_soon">Coming soon (shows a waitlist, no lessons)</option>
            <option value="published">Published (students can see it)</option>
          </select>
          <span className="hint">Published courses only show their published and coming-soon lessons. Waitlist sign-ups: {tree.waitlistCount}.</span>
        </label>
        <label>Tagline<input name="tagline" defaultValue={course.tagline ?? ""} maxLength={200} /></label>
        <label>Description<textarea name="description" defaultValue={course.description} required maxLength={3000} /></label>
        <label>Thumbnail image link<input name="thumbnailUrl" defaultValue={course.thumbnailUrl ?? ""} placeholder="https://…" /></label>
        <label>Position in the recommended order<input name="recommendedOrder" type="number" min={1} max={999} defaultValue={course.recommendedOrder} /></label>

        <h2 style={{ marginTop: ".5rem" }}>Setup guide checklist</h2>
        <p className="muted" style={{ margin: 0 }}>Shown to students as a tick-off list before Module 1. Edit it here whenever tools change; no redeploy needed.</p>
        {setupItems.map((it, i) => (
          <div className="setup-row" key={i}>
            <input value={it.title} placeholder="Title" onChange={(e) => setSetup(setupItems.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
            <textarea rows={2} value={it.detail} placeholder="Details" onChange={(e) => setSetup(setupItems.map((x, k) => (k === i ? { ...x, detail: e.target.value } : x)))} />
            <button type="button" className="link-btn link-btn--danger" onClick={() => setSetup(setupItems.filter((_, k) => k !== i))}>Remove</button>
          </div>
        ))}
        <div>
          <button type="button" className="btn" onClick={() => setSetup([...setupItems, { id: "item-" + (setupItems.length + 1) + "-" + Math.random().toString(36).slice(2, 6), title: "", detail: "" }])}>Add checklist item</button>
        </div>
        <div className="form-actions" style={{ justifyContent: "flex-start" }}><button className="btn btn-primary">Save course</button></div>
      </form>

      <div className="panel">
        <div className="page-head">
          <h2>{course.type === "focused" ? "Modules and lessons" : "Lessons"}</h2>
          <div style={{ display: "flex", gap: ".6rem" }}>
            {course.type === "focused" && <button className="btn" onClick={() => setModuleModal("new")}>Add module</button>}
            {course.type === "utility" && <button className="btn" onClick={() => addLesson()}>Add lesson</button>}
          </div>
        </div>
        {course.type === "focused" && mods.map((m, mi) => {
          const ls = byOrder(lessons.filter((l) => l.moduleId === m._id));
          const ids = ls.map((l) => l._id as string);
          const mids = mods.map((x) => x._id as string);
          return (
            <div className="tree-module" key={m._id}>
              <div className="tree-module__head">
                <strong>Module {m.number}: {m.title}</strong>
                <span style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                  <button className="icon-btn" aria-label="Move module up" disabled={mi === 0} onClick={() => run(() => reorderModules({ courseId, ids: move(mids, mi, -1) as Id<"modules">[] }))}>↑</button>
                  <button className="icon-btn" aria-label="Move module down" disabled={mi === mods.length - 1} onClick={() => run(() => reorderModules({ courseId, ids: move(mids, mi, 1) as Id<"modules">[] }))}>↓</button>
                  <button className="link-btn" onClick={() => setModuleModal(m)}>Edit</button>
                  <button className="link-btn" onClick={() => addLesson(m._id)}>Add lesson</button>
                  {canDelete && <button className="link-btn link-btn--danger" onClick={() => confirm(`Delete module "${m.title}"?`) && run(() => deleteModule({ moduleId: m._id }))}>Delete</button>}
                </span>
              </div>
              {ls.length === 0 && <p className="muted" style={{ padding: ".6rem 1rem", margin: 0 }}>No lessons yet.</p>}
              {ls.map((l, i) => lessonRow(l, ids, i, m._id))}
            </div>
          );
        })}
        {course.type === "utility" && (() => {
          const ls = byOrder(lessons);
          const ids = ls.map((l) => l._id as string);
          return <div className="tree-module">{ls.length === 0 && <p className="muted" style={{ padding: ".6rem 1rem", margin: 0 }}>No lessons yet.</p>}{ls.map((l, i) => lessonRow(l, ids, i))}</div>;
        })()}
      </div>

      {canDelete && (
        <div className="panel">
          <h2>Delete course</h2>
          <p className="muted">Delete all lessons and modules first. This can't be undone.</p>
          <button className="btn" onClick={() => confirm(`Delete "${course.title}"?`) && run(async () => { await deleteCourse({ courseId }); onBack(); })}>Delete this course</button>
        </div>
      )}

      {moduleModal && (
        <Modal title={moduleModal === "new" ? "Add module" : "Edit module"} onClose={() => setModuleModal(null)}>
          <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const title = String(f.get("title")), outcome = String(f.get("outcome") || "") || undefined;
            await run(() => (moduleModal === "new" ? createModule({ courseId, title, outcome }) : updateModule({ moduleId: moduleModal._id, title, outcome })));
            setModuleModal(null);
          }}>
            <label>Title<input name="title" required defaultValue={moduleModal === "new" ? "" : moduleModal.title} /></label>
            <label>What students can do after this module<textarea name="outcome" defaultValue={moduleModal === "new" ? "" : moduleModal.outcome ?? ""} /></label>
            <div className="form-actions"><button type="button" className="btn" onClick={() => setModuleModal(null)}>Cancel</button><button className="btn btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
      {lessonId && <LessonEditor lessonId={lessonId} lesson={lessons.find((l) => l._id === lessonId)!} onClose={() => setLessonId(null)} />}
    </div>
  );
}
