import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { errorText } from "../lib/errorText";

export default function Comments() {
  const queue = useQuery(api.commentAdmin.listQueue, {});
  const setStatus = useMutation(api.commentAdmin.setStatus);
  const [err, setErr] = useState<string | null>(null);

  async function act(commentId: (typeof queue extends (infer T)[] | undefined ? T : never)["_id"], status: "visible" | "hidden") {
    setErr(null);
    try { await setStatus({ commentId, status }); } catch (e) { setErr(errorText(e)); }
  }

  return (
    <div>
      <h1>Lesson comments</h1>
      <p className="muted">Comments students have reported. Hide one to remove it from the lesson, or keep it if it's fine.</p>
      {err && <div className="notice notice--error">{err}</div>}
      <div className="submission-list" style={{ marginTop: "1rem" }}>
        {queue === undefined && <p className="muted">Loading…</p>}
        {queue?.length === 0 && <p className="muted">Nothing reported. All clear.</p>}
        {queue?.map((c) => (
          <div className="submission-card" key={c._id}>
            <div className="submission-card__head"><strong>{c.lessonTitle}</strong><span className="muted">· {c.reportCount} {c.reportCount === 1 ? "report" : "reports"} · {new Date(c.createdAt).toLocaleString()}</span></div>
            <p style={{ whiteSpace: "pre-line" }}>{c.body}</p>
            <p className="muted">By {c.authorEmail ?? "unknown"}</p>
            <div className="submission-card__actions">
              <button className="link-btn link-btn--danger" onClick={() => void act(c._id, "hidden")}>Hide comment</button>
              <button className="link-btn" onClick={() => void act(c._id, "visible")}>Keep it</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
