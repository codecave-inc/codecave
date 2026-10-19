/** Plain-English text for an error from Convex or from our own form parsing. */
export function errorText(e: unknown): string {
  const anyE = e as { data?: unknown; message?: string };
  if (typeof anyE?.data === "string") return anyE.data;
  const m = anyE?.message ?? "";
  const stripped = /Uncaught (?:Convex)?Error: (.+?)(?:\n|$)/.exec(m);
  if (stripped) return stripped[1];
  return m && !m.includes("Server Error") ? m : "Something went wrong. Please try again.";
}
