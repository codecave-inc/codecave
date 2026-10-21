import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { friendlyError } from "../lib/errors";
import { Prose } from "../lib/markdown";
import { formatDuration } from "../lib/format";
import { Alert, Spinner } from "../components/ui";
import { VideoPlayer } from "../components/VideoPlayer";
import type { PlayerHandle } from "../components/VideoPlayer";
import { CommentsPanel } from "../components/lesson/CommentsPanel";
import { LessonTab } from "../components/lesson/LessonTab";
import { NotesPanel } from "../components/lesson/NotesPanel";
import { NotFoundBody } from "./Placeholders";

type TabKey = "lesson" | "notes" | "comments" | "resources" | "check" | "kody";
const TABS: { key: TabKey; label: string; mobileOnly?: boolean }[] = [
  { key: "kody", label: "Kody", mobileOnly: true },
  { key: "lesson", label: "Lesson" },
  { key: "notes", label: "My notes" },
  { key: "comments", label: "Comments" },
  { key: "resources", label: "Resources" },
  { key: "check", label: "Check & submit" },
];

function KodyPane() {
  return (
    <aside className="rounded-md border border-line bg-surface p-5 shadow-sm" aria-label="Kody, your AI learning partner">
      <p className="font-mono text-xs uppercase tracking-[.2em] text-primary">Kody</p>
      <h2 className="mt-1 text-lg">Your AI learning partner</h2>
      <p className="mt-2 text-sm text-ink-2">Kody will watch alongside you, explain ideas, give hints and challenge you. This arrives in the next update.</p>
    </aside>
  );
}

function VideoArea({ lessonId, onReady }: { lessonId: Id<"lessons">; onReady: (h: PlayerHandle | null) => void }) {
  const request = useMutation(api.learn.requestVideo);
  const save = useMutation(api.learn.saveProgress);
  const [video, setVideo] = useState<{ videoId: string; resumeSec: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const handle = useRef<PlayerHandle>(null);
  // Hold the mutation functions in refs so a new function identity can never restart the player.
  const requestRef = useRef(request); requestRef.current = request;
  const saveRef = useRef(save); saveRef.current = save;

  useEffect(() => {
    let live = true;
    setVideo(null); setErr(null);
    requestRef.current({ lessonId }).then((r) => { if (live) setVideo(r); }).catch((e) => { if (live) setErr(friendlyError(e, "We couldn't load the video. Please refresh and try again.")); });
    return () => { live = false; };
  }, [lessonId]);

  useEffect(() => { onReady(handle.current); return () => onReady(null); });

  const onProgress = useCallback((p: { segment?: { start: number; end: number }; positionSec: number; durationSec: number }) => {
    // Progress saving is best effort: a failed save must never interrupt the lesson.
    void saveRef.current({ lessonId, segment: p.segment, positionSec: p.positionSec, playerDurationSec: p.durationSec > 0 ? p.durationSec : undefined }).catch(() => undefined);
  }, [lessonId]);

  if (err) return <div className="grid aspect-video place-items-center rounded-md border border-line bg-surface p-6"><Alert>{err}</Alert></div>;
  if (!video) return <div className="grid aspect-video place-items-center rounded-md bg-black text-white/80"><Spinner className="h-8 w-8" /></div>;
  return <VideoPlayer key={video.videoId} ref={handle} videoId={video.videoId} startSec={video.resumeSec} onProgress={onProgress} />;
}

export default function LessonPage() {
  const { slug = "", lessonId = "" } = useParams();
  const nav = useNavigate();
  const data = useQuery(api.learn.lesson, { lessonId: lessonId as Id<"lessons"> });
  const [tab, setTab] = useState<TabKey>("lesson");
  const player = useRef<PlayerHandle | null>(null);
  const setPlayer = useCallback((h: PlayerHandle | null) => { player.current = h; }, []);
  const seek = useCallback((sec: number) => { player.current?.seekTo(sec); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const currentTime = useCallback(() => player.current?.currentTime() ?? 0, []);

  useEffect(() => { setTab("lesson"); window.scrollTo(0, 0); }, [lessonId]);
  useEffect(() => { if (data) document.title = `${data.lesson.title} · CodeCave Academy`; return () => { document.title = "CodeCave Academy"; }; }, [data]);

  if (data === undefined) return <div className="grid min-h-[50vh] place-items-center text-primary"><Spinner className="h-8 w-8" /></div>;
  if (data === null) return <NotFoundBody />;
  if (data.courseSlug !== slug) { nav(`/courses/${data.courseSlug}/lessons/${lessonId}`, { replace: true }); return null; }

  const { lesson, content, access } = data;
  const id = lesson._id;

  const header = (
    <div>
      <Link to={`/courses/${data.courseSlug}`} className="link text-sm">← {data.courseTitle}</Link>
      <p className="mt-4 font-mono text-xs uppercase tracking-[.2em] text-primary">{data.moduleTitle ? `Module ${data.moduleNumber} · ` : ""}Lesson {lesson.number}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl">{lesson.title}</h1>
      {lesson.durationSec > 0 && <p className="mt-1 font-mono text-xs text-muted">{formatDuration(lesson.durationSec)}</p>}
    </div>
  );

  if (!access.ok) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        {header}
        <section className="mt-6 rounded-md border border-primary/30 bg-primary/10 p-6">
          <h2 className="text-lg">This lesson is part of Pro</h2>
          <p className="mt-2 text-ink-2">The first lesson of every professional course is free. Upgrade to Pro to unlock the rest. Pro plans open very soon.</p>
          {lesson.summary && <p className="mt-4 text-sm">{lesson.summary}</p>}
          {lesson.objectives.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>}
        </section>
      </main>
    );
  }

  const c = content!;
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      {header}
      {access.staffPreview && <div className="mt-4"><Alert kind="info">Staff preview: this lesson isn't published yet, so students can't see it.</Alert></div>}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          {c.hasVideo ? <VideoArea key={id} lessonId={id} onReady={setPlayer} /> : (
            <div className="grid aspect-video place-items-center rounded-md border border-line bg-surface p-6 text-center text-ink-2">The video for this lesson isn't uploaded yet. The notes below are ready.</div>
          )}
          {data.progress && <p className="font-mono text-xs text-muted">{data.progress.videoComplete ? "Video completed" : `${Math.round(data.progress.watchedPct)}% watched`}</p>}

          <div role="tablist" aria-label="Lesson sections" className="flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} onClick={() => setTab(t.key)}
                className={`${t.mobileOnly ? "lg:hidden " : ""}-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === t.key ? "border-primary text-primary" : "border-transparent text-ink-2 hover:text-ink"}`}>{t.label}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pb-4">
            {tab === "kody" && <KodyPane />}
            {tab === "lesson" && <LessonTab lessonId={id} summary={lesson.summary} objectives={lesson.objectives} content={c} seek={seek} />}
            {tab === "notes" && <NotesPanel lessonId={id} lessonTitle={lesson.title} currentTime={currentTime} seek={seek} />}
            {tab === "comments" && <CommentsPanel lessonId={id} />}
            {tab === "resources" && (
              <div className="space-y-3">
                {c.resources.length === 0 && <p className="text-sm text-ink-2">No downloads for this lesson yet.</p>}
                <ul className="space-y-2">{c.resources.map((r, i) => <li key={i}><a className="link" href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></li>)}</ul>
                {c.assetsNote && <p className="text-sm text-ink-2">{c.assetsNote}</p>}
              </div>
            )}
            {tab === "check" && (
              <div className="space-y-4">
                {c.studentOutput && <div><h3 className="text-base">What you'll make</h3><Prose text={c.studentOutput} className="mt-2" /></div>}
                {c.evidenceMd && <div><h3 className="text-base">What to submit</h3><Prose text={c.evidenceMd} className="mt-2" /></div>}
                <Alert kind="info">Questions and submissions open in an upcoming update. Your progress on this video is already being saved.</Alert>
              </div>
            )}
          </div>

          <nav aria-label="Lesson navigation" className="flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
            {data.nav.prev ? <Link className="link" to={`/courses/${data.courseSlug}/lessons/${data.nav.prev._id}`}>← {data.nav.prev.title}</Link> : <span />}
            {data.nav.next ? <Link className="link text-right" to={`/courses/${data.courseSlug}/lessons/${data.nav.next._id}`}>{data.nav.next.title} →</Link> : <span />}
          </nav>
        </div>
        <div className="hidden lg:block"><div className="sticky top-6"><KodyPane /></div></div>
      </div>
    </main>
  );
}
