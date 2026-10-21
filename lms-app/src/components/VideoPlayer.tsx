import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { formatClock, loadYouTube } from "../lib/youtube";
import type { YTPlayer } from "../lib/youtube";

export type PlayerHandle = { seekTo(sec: number): void; currentTime(): number };

type Props = {
  videoId: string;
  startSec: number;
  /** Called about every 5 seconds while watching, and when playback stops. */
  onProgress: (p: { segment?: { start: number; end: number }; positionSec: number; durationSec: number }) => void;
};

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const FLUSH_MS = 5000;
const JUMP_SEC = 3; // a bigger jump than this between samples means the viewer skipped

function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}
function writeFlag(key: string, on: boolean) {
  try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* storage blocked: setting just won't persist */ }
}

/**
 * The lesson video. YouTube's own controls are switched off and a
 * click-shield sits over the player, so viewers can't click through to
 * youtube.com; we draw our own controls. The logo watermark lives inside
 * the same container that goes fullscreen, so it stays visible there.
 */
export const VideoPlayer = forwardRef<PlayerHandle, Props>(function VideoPlayer({ videoId, startSec, onProgress }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const progressCb = useRef(onProgress);
  progressCb.current = onProgress;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [saver, setSaver] = useState(() => readFlag("cc-data-saver"));
  const [full, setFull] = useState(false);

  // Watch-tracking state lives in refs: it must not trigger renders.
  const seg = useRef<{ start: number; last: number } | null>(null);
  const lastFlush = useRef(0);
  const hasPlayed = useRef(false);

  const flush = useCallback((final = false) => {
    const p = player.current;
    if (!p || !ready || !hasPlayed.current) return;
    const t = p.getCurrentTime();
    const s = seg.current;
    progressCb.current({
      segment: s && s.last > s.start ? { start: s.start, end: s.last } : undefined,
      positionSec: t,
      durationSec: p.getDuration(),
    });
    seg.current = final ? null : { start: t, last: t };
    lastFlush.current = Date.now();
  }, [ready]);

  useImperativeHandle(ref, () => ({
    seekTo(sec) {
      const p = player.current;
      if (!p) return;
      flush();
      p.seekTo(sec, true);
      p.playVideo();
      seg.current = { start: sec, last: sec };
    },
    currentTime: () => player.current?.getCurrentTime() ?? 0,
  }), [flush]);

  // (Declared BEFORE the player is created so that on unmount it runs first, while the player still exists.)
  // Save when playback stops, the tab is hidden, or the page closes.
  useEffect(() => {
    if (!ready) return;
    if (!playing) flush(true);
  }, [playing, ready, flush]);
  useEffect(() => {
    if (!ready) return;
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", hide as () => void);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", hide as () => void);
      flush(true);
    };
  }, [ready, flush]);

  // Create the player.
  useEffect(() => {
    let cancelled = false;
    loadYouTube().then((YT) => {
      if (cancelled || !mount.current) return;
      const holder = document.createElement("div");
      mount.current.appendChild(holder);
      player.current = new YT.Player(holder, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, cc_load_policy: 1, playsinline: 1, fs: 0, disablekb: 1, start: Math.floor(startSec), origin: window.location.origin },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (cancelled) return;
            setDuration(e.target.getDuration());
            if (readFlag("cc-data-saver")) e.target.setPlaybackQuality?.("small");
            setReady(true);
          },
          onStateChange: (e: { data: number }) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.PLAYING) {
              hasPlayed.current = true;
              lastFlush.current = Date.now();
              const t = player.current?.getCurrentTime() ?? 0;
              seg.current = { start: t, last: t };
              setDuration(player.current?.getDuration() ?? 0);
            }
          },
          onError: () => setError("This video couldn't be played. Try again in a moment."),
        },
      });
    }).catch(() => setError("We couldn't load the video player. Check your connection and try again."));
    return () => {
      cancelled = true;
      try { player.current?.destroy(); } catch { /* already gone */ }
      player.current = null;
    };
    // The video id never changes for a mounted player (the page re-mounts on lesson change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Sample the clock once a second while playing.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      const t = p.getCurrentTime();
      setTime(t);
      if (p.getPlayerState() !== 1) return;
      const s = seg.current;
      if (!s) { seg.current = { start: t, last: t }; return; }
      if (Math.abs(t - s.last) > JUMP_SEC) {
        // The viewer skipped: bank what they watched, start a fresh segment here.
        progressCb.current({ segment: s.last > s.start ? { start: s.start, end: s.last } : undefined, positionSec: t, durationSec: p.getDuration() });
        seg.current = { start: t, last: t };
        lastFlush.current = Date.now();
        return;
      }
      s.last = t;
      if (Date.now() - lastFlush.current >= FLUSH_MS) flush();
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, flush]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggle = () => { const p = player.current; if (p) (playing ? p.pauseVideo() : p.playVideo()); };
  const seekTo = (sec: number) => {
    const p = player.current; if (!p) return;
    flush(); p.seekTo(sec, true); seg.current = playing ? { start: sec, last: sec } : null; setTime(sec);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void box.current?.requestFullscreen?.();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); seekTo(Math.min(duration, time + 10)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); seekTo(Math.max(0, time - 10)); }
    else if (e.key === "f") { e.preventDefault(); toggleFull(); }
  };

  return (
    <div ref={box} className="group relative aspect-video w-full overflow-hidden rounded-md bg-black text-white shadow-md" onKeyDown={onKey}>
      <div ref={mount} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      {/* Click-shield: viewers can't click through to youtube.com or open its right-click menu. */}
      <button type="button" aria-label={playing ? "Pause" : "Play"} className="absolute inset-0 cursor-pointer bg-transparent" onClick={toggle} onContextMenu={(e) => e.preventDefault()} />
      <img src="/logo.png" alt="" draggable={false} className="pointer-events-none absolute right-3 top-3 h-6 w-auto select-none rounded-sm bg-white/80 p-1 opacity-60" />
      {!ready && !error && <div className="absolute inset-0 grid place-items-center text-sm text-white/80" role="status">Loading video…</div>}
      {error && <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-sm" role="alert">{error}</div>}
      {ready && !playing && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 text-2xl" aria-hidden="true">▶</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-3 gap-y-1 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8 text-xs">
        <button type="button" className="px-1 text-base" onClick={toggle} aria-label={playing ? "Pause" : "Play"} disabled={!ready}>{playing ? "❚❚" : "▶"}</button>
        <span className="font-mono tabular-nums">{formatClock(time)} / {formatClock(duration)}</span>
        <input
          aria-label="Seek" type="range" min={0} max={Math.max(1, Math.floor(duration))} value={Math.min(Math.floor(time), Math.floor(duration))}
          onChange={(e) => seekTo(Number(e.target.value))} disabled={!ready} className="h-1 min-w-[8rem] flex-1 accent-white"
        />
        <label className="flex items-center gap-1">
          <span className="sr-only">Speed</span>
          <select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); player.current?.setPlaybackRate(r); }} className="rounded-sm bg-white/15 px-1 py-0.5 text-white [&>option]:text-black">
            {RATES.map((r) => <option key={r} value={r}>{r}x</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { const p = player.current; if (!p) return; if (muted) { p.unMute(); } else { p.mute(); } setMuted(!muted); }} aria-label={muted ? "Unmute" : "Mute"} className="px-1">{muted ? "🔇" : "🔊"}</button>
        <label className="flex items-center gap-1" title="Asks YouTube for lower quality to save data. YouTube may ignore the request.">
          <input type="checkbox" checked={saver} onChange={(e) => { setSaver(e.target.checked); writeFlag("cc-data-saver", e.target.checked); player.current?.setPlaybackQuality?.(e.target.checked ? "small" : "default"); }} />
          Data saver
        </label>
        <button type="button" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"} className="px-1">{full ? "⤡" : "⤢"}</button>
      </div>
    </div>
  );
});
