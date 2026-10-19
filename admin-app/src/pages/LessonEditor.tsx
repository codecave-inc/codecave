import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import Modal from "../components/Modal";
import { errorText } from "../lib/errorText";
import { formatChapters, formatResources, lines, parseChapters, parseResources, unlines } from "../lib/lessonText";

export default function LessonEditor({ lessonId, lesson, onClose }: { lessonId: Id<"lessons">; lesson: Doc<"lessons">; onClose: () => void }) {
  const update = useMutation(api.courseAdmin.updateLesson);
  const setTranscript = useMutation(api.courseAdmin.setTranscript);
  const clearTranscript = useMutation(api.courseAdmin.clearTranscript);
  const info = useQuery(api.courseAdmin.transcriptInfo, { lessonId });
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [cards, setCards] = useState(lesson.promptCards);

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "");
    try {
      await update({
        lessonId,
        content: {
          title: s("title"), status: s("status") as "draft" | "published" | "coming_soon", isFreePreview: f.get("isFreePreview") === "on",
          summary: s("summary"), youtubeVideoId: s("youtubeVideoId") || undefined, durationMin: Number(s("durationMin") || 0),
          objectives: lines(s("objectives")), keyConcepts: lines(s("keyConcepts")), notesMd: s("notesMd"),
          promptCards: cards.filter((c) => c.title.trim() || c.prompt.trim()), taskMd: s("taskMd"), pitfalls: lines(s("pitfalls")),
          chapters: parseChapters(s("chapters")), tools: lines(s("tools")), studentOutput: s("studentOutput"), evidenceMd: s("evidenceMd"),
          assetsNote: s("assetsNote"), resources: parseResources(s("resources")), recordingFlow: lines(s("recordingFlow")),
          verified: f.get("verified") === "on",
        },
      });
      onClose();
    } catch (e2) {
      setErr(errorText(e2));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 400_000) return setErr("That file is too large for a transcript.");
    setTranscriptText(await file.text());
  }
  async function saveTranscript() {
    setErr(null); setNote(null);
    try {
      const r = await setTranscript({ lessonId, text: transcriptText });
      setNote(`Transcript saved (${r.chunkCount} sections).`);
      setTranscriptText("");
    } catch (e) {
      setErr(errorText(e));
    }
  }

  return (
    <Modal title={`Lesson ${lesson.number}: ${lesson.title}`} onClose={onClose}>
      <div className="modal--wide" style={{ width: "100%" }}>
        <form className="stack" onSubmit={onSave} id="lesson-form">
          <label>Title<input name="title" defaultValue={lesson.title} required /></label>
          <label>Status
            <select name="status" defaultValue={lesson.status}>
              <option value="draft">Draft (hidden from students)</option>
              <option value="coming_soon">Coming soon (listed, not watchable)</option>
              <option value="published">Published (needs a YouTube video)</option>
            </select>
          </label>
          <label className="checkbox-label"><input name="isFreePreview" type="checkbox" defaultChecked={lesson.isFreePreview} /> Free preview (free students can watch it)</label>
          <label>YouTube video link or ID<input name="youtubeVideoId" defaultValue={lesson.youtubeVideoId ?? ""} placeholder="https://youtu.be/…" /></label>
          <label>Duration (minutes)<input name="durationMin" type="number" min={0} max={600} step="0.5" defaultValue={lesson.durationSec / 60} /></label>
          <label>What this lesson is for<textarea name="summary" defaultValue={lesson.summary} /></label>
          <label>Learning objectives <span className="hint">One per line</span><textarea name="objectives" defaultValue={unlines(lesson.objectives)} /></label>
          <label>Key concepts <span className="hint">One per line</span><textarea name="keyConcepts" defaultValue={unlines(lesson.keyConcepts)} /></label>
          <label>Lesson notes <span className="hint">Shown under the video. Plain text; blank lines make paragraphs.</span><textarea name="notesMd" rows={8} defaultValue={lesson.notesMd} /></label>

          <div>
            <strong style={{ fontSize: ".85rem" }}>Copyable AI prompts</strong>
            {cards.map((c, i) => (
              <div key={i} className="panel" style={{ marginTop: ".5rem" }}>
                <input style={{ width: "100%", boxSizing: "border-box", marginBottom: ".4rem" }} value={c.title} placeholder="Prompt title" onChange={(e) => setCards(cards.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
                <textarea style={{ width: "100%", boxSizing: "border-box" }} rows={4} value={c.prompt} placeholder="The prompt students can copy" onChange={(e) => setCards(cards.map((x, k) => (k === i ? { ...x, prompt: e.target.value } : x)))} />
                <button type="button" className="link-btn link-btn--danger" onClick={() => setCards(cards.filter((_, k) => k !== i))}>Remove</button>
              </div>
            ))}
            <div style={{ marginTop: ".5rem" }}><button type="button" className="btn" onClick={() => setCards([...cards, { title: "", prompt: "" }])}>Add prompt</button></div>
          </div>

          <label>Hands-on task<textarea name="taskMd" defaultValue={lesson.taskMd} /></label>
          <label>Common beginner pitfalls <span className="hint">One per line</span><textarea name="pitfalls" defaultValue={unlines(lesson.pitfalls)} /></label>
          <label>Video chapters <span className="hint">One per line, like "12:30 Building the form"</span><textarea name="chapters" defaultValue={formatChapters(lesson.chapters)} /></label>
          <label>Tools used <span className="hint">One per line</span><textarea name="tools" rows={3} defaultValue={unlines(lesson.tools)} /></label>
          <label>What the student produces<textarea name="studentOutput" defaultValue={lesson.studentOutput} /></label>
          <label>Evidence to submit<textarea name="evidenceMd" defaultValue={lesson.evidenceMd} /></label>
          <label>Downloads note<textarea name="assetsNote" rows={2} defaultValue={lesson.assetsNote} /></label>
          <label>Resource links <span className="hint">One per line: "Title | https://link"</span><textarea name="resources" defaultValue={formatResources(lesson.resources)} /></label>
          <label>Recording plan <span className="hint">Instructor-only. Students never see this.</span><textarea name="recordingFlow" defaultValue={unlines(lesson.recordingFlow)} /></label>
          <label className="checkbox-label"><input name="verified" type="checkbox" /> I checked this lesson against current tool versions today{lesson.lastVerifiedAt ? ` (last verified ${new Date(lesson.lastVerifiedAt).toLocaleDateString()})` : ""}</label>
          {err && <p className="form-error">{err}</p>}
          <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save lesson</button></div>
        </form>

        <div className="panel">
          <h2>Transcript</h2>
          <p className="muted">{info === undefined ? "Loading…" : info.chunkCount === 0 ? "No transcript yet. Kody needs one to talk about this lesson." : `${info.chunkCount} sections saved.`}</p>
          <div className="stack">
            <input type="file" accept=".srt,.vtt,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
            <textarea rows={4} placeholder="…or paste the transcript here" value={transcriptText} onChange={(e) => setTranscriptText(e.target.value)} />
            {note && <div className="notice">{note}</div>}
            <div style={{ display: "flex", gap: ".6rem" }}>
              <button type="button" className="btn btn-primary" disabled={!transcriptText.trim()} onClick={saveTranscript}>Save transcript</button>
              {info && info.chunkCount > 0 && <button type="button" className="btn" onClick={() => confirm("Remove this lesson's transcript?") && clearTranscript({ lessonId })}>Remove transcript</button>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
