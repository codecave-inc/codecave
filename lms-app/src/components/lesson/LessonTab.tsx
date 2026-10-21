import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../../lib/errors";
import { Prose } from "../../lib/markdown";
import { formatClock } from "../../lib/youtube";
import { Alert } from "../ui";

type Content = {
  keyConcepts: string[]; notesMd: string; promptCards: { title: string; prompt: string }[]; taskMd: string; pitfalls: string[];
  chapters: { startSec: number; title: string }[]; lastVerifiedAt: number | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2"><h3 className="text-base">{title}</h3>{children}</section>;
}
const List = ({ items }: { items: string[] }) => <ul className="list-disc space-y-1 pl-5 text-[.95rem]">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

function PromptCard({ title, prompt }: { title: string; prompt: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: user can still select the text */ }
  }
  return (
    <div className="rounded-sm border border-line bg-bg-alt p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" className="btn btn-outline !px-3 !py-1.5 text-xs" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className="mt-2 whitespace-pre-wrap font-mono text-[.8rem] leading-relaxed text-ink-2">{prompt}</p>
    </div>
  );
}

function Rating({ lessonId }: { lessonId: Id<"lessons"> }) {
  const mine = useQuery(api.engagement.myRating, { lessonId });
  const rate = useMutation(api.engagement.rate);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const stars = mine?.stars ?? 0;
  const text = feedback ?? mine?.feedback ?? "";
  const send = async (s: number, f = text) => {
    setErr(null); setSaved(false);
    try { await rate({ lessonId, stars: s, feedback: f || undefined }); setSaved(true); } catch (e) { setErr(friendlyError(e, "We couldn't save your rating.")); }
  };
  return (
    <section className="space-y-2 rounded-md border border-line bg-surface p-4">
      <h3 className="text-base">How was this lesson?</h3>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => void send(n)}
            className={`text-2xl leading-none ${n <= stars ? "text-primary" : "text-line"}`}>★</button>
        ))}
      </div>
      {stars > 0 && (
        <div className="flex gap-2">
          <input className="input" aria-label="One-line feedback (optional)" placeholder="One line of feedback (optional)" maxLength={300} value={text} onChange={(e) => setFeedback(e.target.value)} />
          <button className="btn btn-outline !py-2 text-sm" onClick={() => void send(stars)}>Save</button>
        </div>
      )}
      {saved && <p className="text-xs text-success">Thanks, saved.</p>}
      {err && <Alert>{err}</Alert>}
    </section>
  );
}

export function LessonTab({ lessonId, summary, objectives, content, seek }: {
  lessonId: Id<"lessons">; summary: string; objectives: string[]; content: Content; seek: (sec: number) => void;
}) {
  const transcript = useQuery(api.learn.transcript, { lessonId });
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <div className="space-y-6">
      {summary && <p className="text-ink-2">{summary}</p>}
      {objectives.length > 0 && <Section title="What you'll learn"><List items={objectives} /></Section>}
      {content.chapters.length > 0 && (
        <Section title="Chapters">
          <ul className="space-y-1">
            {content.chapters.map((c, i) => (
              <li key={i}><button type="button" className="flex w-full gap-3 rounded-sm px-2 py-1 text-left text-sm hover:bg-bg-alt" onClick={() => seek(c.startSec)}>
                <span className="w-14 shrink-0 font-mono text-xs text-primary">{formatClock(c.startSec)}</span><span>{c.title}</span></button></li>
            ))}
          </ul>
        </Section>
      )}
      {content.keyConcepts.length > 0 && <Section title="Key concepts"><List items={content.keyConcepts} /></Section>}
      {content.notesMd && <Section title="Lesson notes"><Prose text={content.notesMd} /></Section>}
      {content.promptCards.length > 0 && <Section title="Prompts to copy and adapt">{content.promptCards.map((p, i) => <PromptCard key={i} {...p} />)}<p className="text-xs text-muted">Use these as a starting point. Change the details to fit your own project.</p></Section>}
      {content.taskMd && <Section title="Your hands-on task"><Prose text={content.taskMd} /></Section>}
      {content.pitfalls.length > 0 && <Section title="Common mistakes to avoid"><List items={content.pitfalls} /></Section>}
      {transcript && transcript.length > 0 && (
        <Section title="Transcript">
          <button type="button" className="link text-sm" aria-expanded={showTranscript} onClick={() => setShowTranscript(!showTranscript)}>{showTranscript ? "Hide transcript" : "Show transcript"}</button>
          {showTranscript && (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-sm border border-line bg-surface p-3 text-sm">
              {transcript.map((c, i) => (
                <p key={i}>{c.startSec > 0 || i > 0 ? <button type="button" className="mr-2 font-mono text-xs text-primary hover:underline" onClick={() => seek(c.startSec)}>{formatClock(c.startSec)}</button> : null}{c.text}</p>
              ))}
            </div>
          )}
        </Section>
      )}
      <Rating lessonId={lessonId} />
      {content.lastVerifiedAt && <p className="text-xs text-muted">Last checked against current tool versions on {new Date(content.lastVerifiedAt).toLocaleDateString()}.</p>}
    </div>
  );
}
