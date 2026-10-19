/** Converts between the plain-text boxes in the lesson form and the stored lists. */

export const lines = (s: string): string[] => s.split("\n").map((x) => x.trim()).filter(Boolean);
export const unlines = (a: readonly string[]): string => a.join("\n");

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "12:30 Title", "1:02:03 Title" or "90 Title" (seconds) → chapters. Throws a plain-English message on a bad line. */
export function parseChapters(text: string): { startSec: number; title: string }[] {
  return lines(text).map((line) => {
    const m = /^(\d+(?::\d{1,2}){0,2})\s+(.+)$/.exec(line);
    if (!m) throw new Error(`Chapter line "${line}" should look like "12:30 Chapter title".`);
    const parts = m[1].split(":").map(Number);
    if (parts.slice(1).some((p) => p > 59)) throw new Error(`Chapter time "${m[1]}" isn't valid.`);
    const startSec = parts.reduce((acc, p) => acc * 60 + p, 0);
    return { startSec, title: m[2].trim() };
  });
}
export const formatChapters = (c: readonly { startSec: number; title: string }[]): string => c.map((x) => `${fmtTime(x.startSec)} ${x.title}`).join("\n");

/** "Title | https://link" per line. */
export function parseResources(text: string): { title: string; url: string }[] {
  return lines(text).map((line) => {
    const i = line.lastIndexOf("|");
    if (i < 1) throw new Error(`Resource line "${line}" should look like "Title | https://link".`);
    return { title: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
  });
}
export const formatResources = (r: readonly { title: string; url: string }[]): string => r.map((x) => `${x.title} | ${x.url}`).join("\n");
