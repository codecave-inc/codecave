import { apiKeyFor, baseUrlFor } from "./aiSettings";
import type { Provider } from "./aiSettings";

/**
 * The only file that talks to an AI provider. The rest of the app asks for
 * "a streamed chat reply" and never knows whether Requesty, Anthropic or
 * anything else answered, so switching provider is a settings change, not a rewrite.
 *
 *  - requesty / custom: OpenAI-compatible  POST {base}/chat/completions
 *  - anthropic:         Anthropic Messages POST {base}/v1/messages
 */

export type ChatMsg = { role: "user" | "assistant"; content: string };

export class GatewayError extends Error {
  constructor(message: string, readonly status: number, readonly gotOutput: boolean) {
    super(message);
  }
}

export type StreamResult = { text: string; tokensIn: number; tokensOut: number; estimated: boolean };

const TIMEOUT_MS = 90_000;
export const approxTokens = (s: string) => Math.ceil(s.length / 4);

/** Reads a Server-Sent-Events body and calls onData for every `data:` payload. */
export async function readSse(body: ReadableStream<Uint8Array>, onData: (data: string) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i: number;
    while ((i = buf.search(/\r?\n/)) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(buf[i] === "\r" && buf[i + 1] === "\n" ? i + 2 : i + 1);
      if (line.startsWith("data:")) onData(line.slice(5).trim());
    }
  }
  if (buf.startsWith("data:")) onData(buf.slice(5).trim());
}

export async function streamChat(opts: {
  provider: Provider;
  model: string;
  system: string;
  messages: ChatMsg[];
  maxTokens: number;
  onDelta: (text: string) => void | Promise<void>;
}): Promise<StreamResult> {
  const key = apiKeyFor(opts.provider);
  const base = baseUrlFor(opts.provider);
  if (!key || !base) throw new GatewayError("The AI provider isn't configured.", 0, false);
  const anthropic = opts.provider === "anthropic";
  const url = anthropic ? `${base}/v1/messages` : `${base}/chat/completions`;
  const headers: Record<string, string> = { "content-type": "application/json", accept: "text/event-stream" };
  if (anthropic) { headers["x-api-key"] = key; headers["anthropic-version"] = "2023-06-01"; }
  else headers.authorization = `Bearer ${key}`;
  const payload = anthropic
    ? { model: opts.model, max_tokens: opts.maxTokens, system: opts.system, messages: opts.messages, stream: true }
    : {
        model: opts.model, max_tokens: opts.maxTokens, stream: true, stream_options: { include_usage: true },
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let text = "";
  let tokensIn = 0, tokensOut = 0;
  let streamError: string | null = null;
  try {
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: ctl.signal });
    } catch (e) {
      throw new GatewayError(`Could not reach the AI provider (${e instanceof Error ? e.message : "network"}).`, 0, false);
    }
    if (!res.ok || !res.body) {
      // Never forward the provider's body to students; keep a short copy for the owner's log.
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new GatewayError(`AI provider returned ${res.status}. ${detail}`, res.status, false);
    }
    const pending: Promise<void>[] = [];
    await readSse(res.body, (data) => {
      if (!data || data === "[DONE]") return;
      let j: any;
      try { j = JSON.parse(data); } catch { return; }
      if (anthropic) {
        if (j.type === "message_start") tokensIn = j.message?.usage?.input_tokens ?? tokensIn;
        else if (j.type === "content_block_delta" && typeof j.delta?.text === "string") { text += j.delta.text; pending.push(Promise.resolve(opts.onDelta(j.delta.text))); }
        else if (j.type === "message_delta") tokensOut = j.usage?.output_tokens ?? tokensOut;
        else if (j.type === "error") streamError = String(j.error?.message ?? "stream error");
      } else {
        if (j.error) streamError = String(j.error.message ?? "stream error");
        const piece = j.choices?.[0]?.delta?.content;
        if (typeof piece === "string" && piece) { text += piece; pending.push(Promise.resolve(opts.onDelta(piece))); }
        if (j.usage) { tokensIn = j.usage.prompt_tokens ?? tokensIn; tokensOut = j.usage.completion_tokens ?? tokensOut; }
      }
    });
    await Promise.all(pending);
    if (streamError && !text) throw new GatewayError(`AI provider error: ${streamError}`, 502, false);
    if (!text.trim()) throw new GatewayError("The AI provider returned an empty reply.", 502, false);
  } catch (e) {
    if (e instanceof GatewayError) throw e;
    throw new GatewayError(`AI request failed (${e instanceof Error ? e.message : "unknown"}).`, 0, text.length > 0);
  } finally {
    clearTimeout(timer);
  }
  const estimated = tokensIn === 0 && tokensOut === 0;
  if (estimated) {
    tokensIn = approxTokens(opts.system + opts.messages.map((m) => m.content).join(""));
    tokensOut = approxTokens(text);
  }
  return { text, tokensIn, tokensOut, estimated };
}
