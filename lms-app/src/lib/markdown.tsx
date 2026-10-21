import type { ReactNode } from "react";

/**
 * A deliberately tiny, SAFE renderer for admin-written lesson text:
 * paragraphs, "- " bullet lists, **bold**, `code` and https links.
 * It builds React elements (never raw HTML), so nothing typed into the
 * admin can inject markup or script.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0], key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="rounded-sm bg-bg-alt px-1.5 py-0.5 font-mono text-[.85em]">{tok.slice(1, -1)}</code>);
    else {
      const [, label, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)!;
      out.push(<a key={key} href={url} target="_blank" rel="noopener noreferrer" className="link">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Prose({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`space-y-3 text-[.95rem] leading-relaxed text-ink ${className}`}>
      {blocks.map((b, bi) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-*]\s+/, ""), `${bi}-${li}`)}</li>)}
            </ul>
          );
        }
        return <p key={bi}>{lines.flatMap((l, li) => (li ? [<br key={`b${li}`} />, ...inline(l, `${bi}-${li}`)] : inline(l, `${bi}-${li}`)))}</p>;
      })}
    </div>
  );
}
