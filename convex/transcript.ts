import { fail } from "./validation";

/**
 * Turns a pasted or uploaded transcript (.srt, .vtt, or plain text) into
 * chunks that Kody can search later. Pure functions, no database.
 */

export type Chunk = { startSec: number; endSec: number; text: string };

const TS_RE = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})/;
const CUE_RE = new RegExp(`${TS_RE.source}\\s*-->\\s*${TS_RE.source}`);

function toSec(h: string | undefined, m: string, s: string, ms: string): number {
  return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
}

export const MAX_TRANSCRIPT_CHARS = 400_000;
const TARGET_CHARS = 700;
const MAX_CHUNKS = 1500;

export function parseTranscript(raw: string): Chunk[] {
  if (raw.length > MAX_TRANSCRIPT_CHARS) fail("That transcript is too large.");
  const lines = raw.replace(/\r/g, "").replace(/^﻿/, "").split("\n");
  const cues: Chunk[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = CUE_RE.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const startSec = toSec(m[1], m[2], m[3], m[4]);
    const endSec = toSec(m[5], m[6], m[7], m[8]);
    i++;
    const text: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      text.push(lines[i].replace(/<[^>]+>/g, "").trim());
      i++;
    }
    const joined = text.join(" ").replace(/\s+/g, " ").trim();
    if (joined) cues.push({ startSec, endSec, text: joined });
  }
  if (cues.length === 0) {
    // Plain text with no timestamps: one untimed chunk per paragraph.
    const paras = raw.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (paras.length === 0) fail("The transcript is empty.");
    const out: Chunk[] = [];
    for (const p of paras) for (let k = 0; k < p.length; k += TARGET_CHARS) out.push({ startSec: 0, endSec: 0, text: p.slice(k, k + TARGET_CHARS) });
    if (out.length > MAX_CHUNKS) fail("That transcript is too large.");
    return out;
  }
  const merged: Chunk[] = [];
  let cur: Chunk | null = null;
  for (const c of cues) {
    if (cur && cur.text.length + c.text.length + 1 <= TARGET_CHARS) {
      cur.text += " " + c.text;
      cur.endSec = c.endSec;
    } else {
      if (cur) merged.push(cur);
      cur = { ...c };
    }
  }
  if (cur) merged.push(cur);
  if (merged.length > MAX_CHUNKS) fail("That transcript is too large.");
  return merged.map((c) => ({ ...c, startSec: Math.floor(c.startSec), endSec: Math.ceil(c.endSec) }));
}
