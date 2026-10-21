/**
 * Watch-progress arithmetic. Pure functions, no database.
 * Progress counts UNIQUE seconds watched, so skipping to the end or
 * replaying the same minute never inflates it.
 */
export type Range = { start: number; end: number };

/** Gaps of up to this many seconds are treated as continuous (the player is sampled about once a second). */
const GAP_TOLERANCE = 1.5;

export function mergeRanges(ranges: Range[]): Range[] {
  const sorted = ranges.filter((r) => r.end > r.start).map((r) => ({ ...r })).sort((a, b) => a.start - b.start);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end + GAP_TOLERANCE) last.end = Math.max(last.end, r.end);
    else out.push(r);
  }
  return out;
}

export function totalSeconds(ranges: Range[]): number {
  return ranges.reduce((s, r) => s + (r.end - r.start), 0);
}

export const COMPLETE_AT_PCT = 90;
export const MAX_RANGES = 400;

/**
 * Adds a freshly watched segment. A real player can't watch faster than
 * about 2x, so the credited length is capped by the wall-clock time since
 * the last save (`elapsedSec`); that stops someone calling the API with a
 * single huge segment to mark a lesson watched.
 */
export function addSegment(
  ranges: Range[],
  segment: Range,
  opts: { videoSec: number; elapsedSec: number | null }
): Range[] {
  const start = Math.max(0, segment.start);
  const end = Math.min(opts.videoSec, segment.end);
  if (!(end > start)) return ranges;
  const allowed = Math.min(60, opts.elapsedSec === null ? 15 : opts.elapsedSec * 2.25 + 6);
  const credited: Range = { start, end: Math.min(end, start + allowed) };
  return mergeRanges([...ranges, credited]).slice(0, MAX_RANGES);
}

export function percent(watchedSec: number, videoSec: number): number {
  if (videoSec <= 0) return 0;
  return Math.min(100, Math.round((watchedSec / videoSec) * 1000) / 10);
}

/**
 * The length to measure progress against. The admin's typed duration can
 * be a little off the real video, so we trust the player's own figure when
 * it is within a believable range of the typed one.
 */
export function effectiveVideoSec(declaredSec: number, playerSec: number | undefined): number {
  if (playerSec === undefined || !Number.isFinite(playerSec) || playerSec < 30 || playerSec > 4 * 3600) return declaredSec;
  if (declaredSec <= 0) return Math.round(playerSec);
  if (playerSec < declaredSec * 0.5 || playerSec > declaredSec * 1.5) return declaredSec;
  return Math.round(playerSec);
}
