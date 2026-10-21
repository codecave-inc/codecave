import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../../lib/errors";
import { formatClock } from "../../lib/youtube";
import { Alert } from "../ui";

type Props = { lessonId: Id<"lessons">; lessonTitle: string; currentTime: () => number; seek: (sec: number) => void };

export function NotesPanel({ lessonId, lessonTitle, currentTime, seek }: Props) {
  const notes = useQuery(api.engagement.listNotes, { lessonId });
  const add = useMutation(api.engagement.addNote);
  const update = useMutation(api.engagement.updateNote);
  const remove = useMutation(api.engagement.deleteNote);
  const [text, setText] = useState("");
  const [at, setAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: Id<"notes">; body: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const guard = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); } catch (e) { setErr(friendlyError(e, "We couldn't save that. Please try again.")); }
  };

  function exportMarkdown() {
    const md = `# Notes: ${lessonTitle}\n\n` + (notes ?? []).map((n) => `- **${formatClock(n.timestampSec)}** ${n.body.replace(/\n/g, "\n  ")}`).join("\n") + "\n";
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `notes-${lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void guard(async () => { await add({ lessonId, timestampSec: at ?? currentTime(), body: text }); setText(""); setAt(null); });
        }}
      >
        <label htmlFor="note-body" className="block text-sm font-semibold">
          New note <span className="font-normal text-muted">at {formatClock(at ?? currentTime())}</span>
        </label>
        <textarea id="note-body" className="input min-h-[5.5rem]" value={text} maxLength={2000} placeholder="Type something you want to remember…"
          onFocus={() => setAt(currentTime())} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn btn-primary !py-2 text-sm" disabled={!text.trim()}>Save note</button>
          {notes && notes.length > 0 && <button type="button" className="btn btn-outline !py-2 text-sm" onClick={exportMarkdown}>Export notes</button>}
        </div>
        <p className="text-xs text-muted">Notes are private to you. The time is where the video was when you started typing.</p>
      </form>
      {err && <Alert>{err}</Alert>}
      <ul className="space-y-3">
        {notes?.length === 0 && <li className="text-sm text-ink-2">No notes yet.</li>}
        {notes?.map((n) => (
          <li key={n._id} className="rounded-sm border border-line bg-surface p-3">
            <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline" onClick={() => seek(n.timestampSec)}>{formatClock(n.timestampSec)}</button>
            {editing?.id === n._id ? (
              <div className="mt-2 space-y-2">
                <textarea className="input min-h-[4rem]" value={editing.body} onChange={(e) => setEditing({ id: n._id, body: e.target.value })} />
                <div className="flex gap-2">
                  <button className="btn btn-primary !py-1.5 text-sm" onClick={() => void guard(async () => { await update({ noteId: n._id, body: editing.body }); setEditing(null); })}>Save</button>
                  <button className="btn btn-outline !py-1.5 text-sm" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 whitespace-pre-line text-sm">{n.body}</p>
                <div className="mt-2 flex gap-4 text-xs">
                  <button className="link" onClick={() => setEditing({ id: n._id, body: n.body })}>Edit</button>
                  <button className="font-semibold text-danger hover:underline" onClick={() => confirm("Delete this note?") && void guard(() => remove({ noteId: n._id }))}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
