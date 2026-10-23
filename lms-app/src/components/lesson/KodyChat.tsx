import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../../lib/errors";
import { Prose } from "../../lib/markdown";
import { Alert, Spinner } from "../ui";

type Props = { lessonId: Id<"lessons">; currentTime: () => number };
type Kind = "explain" | "hint" | "quiz" | "stuck" | "free";

const ACTIONS: { kind: Exclude<Kind, "stuck" | "free">; label: string }[] = [
  { kind: "explain", label: "Explain this part" },
  { kind: "hint", label: "Give me a hint" },
  { kind: "quiz", label: "Quiz me" },
];

export function KodyChat({ lessonId, currentTime }: Props) {
  const data = useQuery(api.kody.thread, { lessonId });
  const send = useMutation(api.kody.send);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [form, setForm] = useState({ goal: "", expected: "", happened: "", error: "", tried: "" });
  const listRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef(send); sendRef.current = send;

  const last = data?.messages[data.messages.length - 1];
  const busy = sending || last?.status === "streaming";

  // Keep the newest words in view while Kody types.
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [data?.messages.length, last?.content]);

  async function submit(kind: Kind, body: string) {
    setErr(null); setSending(true);
    try {
      await sendRef.current({ lessonId, kind, text: body, positionSec: currentTime() });
      return true;
    } catch (e) {
      setErr(friendlyError(e, "Kody couldn't take that message. Please try again."));
      return false;
    } finally { setSending(false); }
  }

  if (data === undefined) return <div className="grid place-items-center p-8 text-primary"><Spinner /></div>;
  if (data === null) return <Alert kind="info">Kody is available once you can open this lesson.</Alert>;

  const { status, messages } = data;
  const canChat = status.available && status.remaining > 0 && !busy;
  const stuckReady = form.goal.trim() && form.happened.trim();

  return (
    <section className="flex h-[min(34rem,calc(100vh-9rem))] min-h-[22rem] flex-col rounded-md border border-line bg-surface shadow-sm" aria-label="Kody, your AI learning partner">
      <header className="border-b border-line px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base"><span className="font-mono text-xs uppercase tracking-[.2em] text-primary">Kody</span> <span className="text-ink-2">· your AI learning partner</span></h2>
          {status.available && <span className="shrink-0 font-mono text-xs text-muted" aria-live="polite">{status.remaining} of {status.limit} left today</span>}
        </div>
        <p className="mt-1 text-xs text-muted">Kody can make mistakes. Check important details.</p>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" role="log" aria-live="polite" aria-label="Conversation with Kody">
        {messages.length === 0 && (
          <p className="text-sm text-ink-2">Hi, I'm Kody. I watch the lesson with you, so ask me about the part you're on. I give hints and questions, not ready-made answers, because that's how it sticks.</p>
        )}
        {messages.map((m) => m.role === "user" ? (
          <div key={m._id} className="ml-8 whitespace-pre-wrap break-words rounded-md bg-primary/10 px-3 py-2 text-sm">{m.content}</div>
        ) : (
          <div key={m._id} className={`mr-4 rounded-md border px-3 py-2 text-sm ${m.status === "error" ? "border-danger/30 bg-danger/5 text-ink-2" : "border-line bg-bg"}`}>
            {m.content ? <Prose text={m.content} /> : <span className="inline-flex items-center gap-2 text-muted"><Spinner className="h-3.5 w-3.5" /> Kody is thinking…</span>}
            {m.status === "streaming" && m.content && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />}
          </div>
        ))}
      </div>

      <div className="max-h-[70%] space-y-2 overflow-y-auto border-t border-line px-4 py-3">
        {err && <Alert>{err}</Alert>}
        {!status.available && <Alert kind="info">{status.reason === "limited" ? "Kody is temporarily limited right now. Your notes and the lesson are still here." : "Kody is resting right now. Please check back soon."}</Alert>}
        {status.available && status.remaining === 0 && (
          <Alert kind="info">{status.pro ? "You've used all your Kody messages for today. They reset tomorrow." : "You've used your free Kody messages for today. They reset tomorrow, or upgrade to Pro for more."}</Alert>
        )}

        {stuck ? (
          <form className="space-y-2 rounded-sm border border-line bg-bg p-3" onSubmit={async (e) => {
            e.preventDefault();
            const body = [`What I'm trying to do: ${form.goal}`, form.expected && `What I expected: ${form.expected}`, `What happened: ${form.happened}`, form.error && `Exact error message: ${form.error}`, form.tried && `What I already tried: ${form.tried}`].filter(Boolean).join("\n");
            if (await submit("stuck", body)) { setStuck(false); setForm({ goal: "", expected: "", happened: "", error: "", tried: "" }); }
          }}>
            <p className="text-sm font-semibold">I'm stuck: tell Kody what you can</p>
            {([["goal", "What are you trying to do? *"], ["expected", "What did you expect to happen?"], ["happened", "What actually happened? *"], ["error", "Exact error message (copy and paste)"], ["tried", "What have you already tried?"]] as const).map(([k, label]) => (
              <div key={k}>
                <label htmlFor={`stuck-${k}`} className="block text-xs text-ink-2">{label}</label>
                <textarea id={`stuck-${k}`} className="input min-h-[2.5rem] text-sm" rows={1} maxLength={400} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="btn btn-primary !py-2 text-sm" disabled={!stuckReady || !canChat}>Send to Kody</button>
              <button type="button" className="btn btn-outline !py-2 text-sm" onClick={() => setStuck(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {ACTIONS.map((a) => (
                <button key={a.kind} type="button" className="btn btn-outline !px-3 !py-1.5 text-xs" disabled={!canChat} onClick={() => void submit(a.kind, "")}>{a.label}</button>
              ))}
              <button type="button" className="btn btn-outline !px-3 !py-1.5 text-xs" disabled={!status.available || status.remaining === 0} onClick={() => setStuck(true)}>I'm stuck</button>
            </div>
            <form className="flex items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (!text.trim() || !canChat) return; if (await submit("free", text)) setText(""); }}>
              <label htmlFor="kody-input" className="sr-only">Message Kody</label>
              <textarea id="kody-input" className="input min-h-[2.75rem] flex-1 text-sm" rows={2} maxLength={1500} value={text} disabled={!status.available || status.remaining === 0}
                placeholder="Ask about this part of the lesson…" onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
              <button className="btn btn-primary !py-2.5 text-sm" disabled={!text.trim() || !canChat}>Send</button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
