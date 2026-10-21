import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../../lib/errors";
import { Alert } from "../ui";

function ago(ms: number): string {
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

type C = { _id: Id<"comments">; body: string; createdAt: number; mine: boolean; author: string; isStaff: boolean };

export function CommentsPanel({ lessonId }: { lessonId: Id<"lessons"> }) {
  const comments = useQuery(api.engagement.listComments, { lessonId });
  const add = useMutation(api.engagement.addComment);
  const report = useMutation(api.engagement.reportComment);
  const del = useMutation(api.engagement.deleteMyComment);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Id<"comments"> | null>(null);
  const [reply, setReply] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const guard = async (fn: () => Promise<unknown>, ok?: string) => {
    setErr(null); setNote(null);
    try { await fn(); if (ok) setNote(ok); } catch (e) { setErr(friendlyError(e, "We couldn't do that. Please try again.")); }
  };

  const item = (c: C, parentId?: Id<"comments">) => (
    <div key={c._id} className="text-sm">
      <p>
        <span className="font-semibold">{c.author}</span>
        {c.isStaff && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Team</span>}
        <span className="ml-2 text-xs text-muted">{ago(c.createdAt)}</span>
      </p>
      <p className="mt-1 whitespace-pre-line">{c.body}</p>
      <div className="mt-1 flex gap-4 text-xs">
        {!parentId && <button className="link" onClick={() => { setReplyTo(replyTo === c._id ? null : c._id); setReply(""); }}>Reply</button>}
        {c.mine
          ? <button className="font-semibold text-danger hover:underline" onClick={() => confirm("Delete your comment?") && void guard(() => del({ commentId: c._id }))}>Delete</button>
          : <button className="text-muted hover:underline" onClick={() => confirm("Report this comment to the team?") && void guard(() => report({ commentId: c._id }), "Thanks. The team will take a look.")}>Report</button>}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void guard(async () => { await add({ lessonId, body: text }); setText(""); }); }}>
        <label htmlFor="comment-body" className="block text-sm font-semibold">Ask or share something</label>
        <textarea id="comment-body" className="input min-h-[5rem]" value={text} maxLength={1500} onChange={(e) => setText(e.target.value)} placeholder="Be kind and specific. Everyone taking this lesson can see this." />
        <button className="btn btn-primary !py-2 text-sm" disabled={!text.trim()}>Post comment</button>
      </form>
      {err && <Alert>{err}</Alert>}
      {note && <Alert kind="success">{note}</Alert>}
      <div className="space-y-5">
        {comments?.length === 0 && <p className="text-sm text-ink-2">No comments yet. Be the first.</p>}
        {comments?.map((c) => (
          <div key={c._id} className="space-y-3 rounded-sm border border-line bg-surface p-4">
            {item(c)}
            {c.replies.length > 0 && <div className="space-y-3 border-l-2 border-line pl-4">{c.replies.map((r) => item(r, c._id))}</div>}
            {replyTo === c._id && (
              <form className="space-y-2 pl-4" onSubmit={(e) => { e.preventDefault(); void guard(async () => { await add({ lessonId, body: reply, parentId: c._id }); setReply(""); setReplyTo(null); }); }}>
                <label className="sr-only" htmlFor={`r-${c._id}`}>Your reply</label>
                <textarea id={`r-${c._id}`} className="input min-h-[4rem]" value={reply} maxLength={1500} autoFocus onChange={(e) => setReply(e.target.value)} />
                <button className="btn btn-primary !py-1.5 text-sm" disabled={!reply.trim()}>Reply</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
