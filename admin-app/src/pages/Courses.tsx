import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Modal from "../components/Modal";
import CourseEditor from "./CourseEditor";
import { errorText } from "../lib/errorText";

export default function Courses({ canDelete }: { canDelete: boolean }) {
  const courses = useQuery(api.courseAdmin.listCourses, {});
  const importOutline = useMutation(api.courseAdmin.importWebDevOutline);
  const create = useMutation(api.courseAdmin.createCourse);
  const [openId, setOpenId] = useState<Id<"courses"> | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (openId) return <CourseEditor courseId={openId} canDelete={canDelete} onBack={() => setOpenId(null)} />;

  const hasWebDev = courses?.some((c) => c.slug === "ai-website-development");

  async function doImport() {
    setMsg(null);
    try {
      const r = await importOutline({});
      setMsg({ ok: true, text: r.created ? "Imported 7 modules and 21 lessons as drafts. Open the course to review them." : "That course already exists, so nothing was changed." });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    }
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const id = await create({
        slug: String(f.get("slug")), title: String(f.get("title")), type: f.get("type") as "focused" | "utility",
        description: String(f.get("description")), tagline: String(f.get("tagline") || "") || undefined,
      });
      setAdding(false);
      setOpenId(id);
    } catch (err) {
      setMsg({ ok: false, text: errorText(err) });
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Courses</h1>
          <p className="muted">Create and edit what students see in CodeCave Academy. New courses start as drafts that only staff can see.</p>
        </div>
        <div style={{ display: "flex", gap: ".6rem" }}>
          {courses && !hasWebDev && <button className="btn" onClick={doImport}>Import the AI Website Development outline</button>}
          <button className="btn btn-primary" onClick={() => setAdding(true)}>New course</button>
        </div>
      </div>
      {msg && <div className={"notice" + (msg.ok ? "" : " notice--error")}>{msg.text}</div>}
      <div className="course-list">
        {courses === undefined && <p className="muted">Loading…</p>}
        {courses?.length === 0 && <p className="muted">No courses yet. Import the outline or create one.</p>}
        {courses?.map((c) => (
          <button key={c._id} className="course-card" onClick={() => setOpenId(c._id)}>
            <div>
              <h3>{c.title}</h3>
              <span className="muted">{c.type === "focused" ? "Professional course" : "AI utility course"} · {c.lessonCount} lessons · {c.publishedLessons} published</span>
            </div>
            <span className={"pill pill--" + c.status}>{c.status.replace("_", " ")}</span>
          </button>
        ))}
      </div>
      {adding && (
        <Modal title="New course" onClose={() => setAdding(false)}>
          <form onSubmit={onCreate} className="stack">
            <label>Title<input name="title" required maxLength={120} /></label>
            <label>Web address name<input name="slug" required placeholder="ai-mobile-app-development" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              <span className="hint">Lowercase letters, numbers and dashes. It becomes lms.codecave.com.ng/courses/this-name.</span></label>
            <label>Type<select name="type"><option value="focused">Professional course (modules and lessons)</option><option value="utility">AI utility course (lessons only)</option></select></label>
            <label>One-line tagline<input name="tagline" maxLength={200} /></label>
            <label>Description<textarea name="description" required maxLength={3000} /></label>
            <div className="form-actions"><button type="button" className="btn" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary">Create</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
