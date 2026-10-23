import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { errorText } from "../lib/errorText";

type Form = {
  enabled: boolean; provider: "requesty" | "anthropic" | "custom"; modelChat: string; modelFallback: string; modelGrading: string;
  dailyFree: string; dailyPro: string; monthlyTokenCap: string; priceInPerM: string; priceOutPerM: string; maxOutputTokens: string;
};

const KEY_NAME = { requesty: "REQUESTY_API_KEY", anthropic: "ANTHROPIC_API_KEY", custom: "AI_API_KEY and AI_BASE_URL" } as const;
const fmt = (n: number) => n.toLocaleString();

export default function AiSettings() {
  const data = useQuery(api.aiAdmin.getAiSettings, {});
  const usage = useQuery(api.aiAdmin.usageSummary, {});
  const save = useMutation(api.aiAdmin.saveSettings);
  const test = useAction(api.aiAdmin.testConnection);
  const [f, setF] = useState<Form | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !f) {
      const s = data.settings;
      setF({ enabled: s.enabled, provider: s.provider, modelChat: s.modelChat, modelFallback: s.modelFallback, modelGrading: s.modelGrading,
        dailyFree: String(s.dailyFree), dailyPro: String(s.dailyPro), monthlyTokenCap: String(s.monthlyTokenCap),
        priceInPerM: String(s.priceInPerM), priceOutPerM: String(s.priceOutPerM), maxOutputTokens: String(s.maxOutputTokens) });
    }
  }, [data, f]);

  if (data === undefined || usage === undefined || !f) return <p className="muted">Loading…</p>;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const keyOk = data.keys[f.provider];

  async function onSave() {
    if (!f) return;
    setBusy(true); setMsg(null);
    try {
      await save({
        enabled: f.enabled, provider: f.provider, modelChat: f.modelChat, modelFallback: f.modelFallback, modelGrading: f.modelGrading,
        dailyFree: Number(f.dailyFree), dailyPro: Number(f.dailyPro), monthlyTokenCap: Number(f.monthlyTokenCap),
        priceInPerM: Number(f.priceInPerM), priceOutPerM: Number(f.priceOutPerM), maxOutputTokens: Number(f.maxOutputTokens),
      });
      setMsg({ ok: true, text: "Saved. New messages use these settings straight away." });
    } catch (e) { setMsg({ ok: false, text: errorText(e) }); }
    setBusy(false);
  }
  async function onTest(target: "chat" | "fallback") {
    setBusy(true); setMsg({ ok: true, text: "Testing… (save first if you just changed something)" });
    try { const r = await test({ target }); setMsg({ ok: r.ok, text: r.message }); }
    catch (e) { setMsg({ ok: false, text: errorText(e) }); }
    setBusy(false);
  }

  const row = (label: string, el: React.ReactNode, hint?: string) => (
    <div className="settings-row"><label>{label}</label>{el}{hint && <p className="muted">{hint}</p>}</div>
  );
  const input = (k: keyof Form, placeholder?: string) => (
    <div className="settings-row__input"><input value={String(f[k])} placeholder={placeholder} onChange={(e) => set(k, e.target.value as never)} /></div>
  );

  return (
    <div>
      <h1>AI settings (Kody)</h1>
      <p className="muted">Owner only. API keys are never shown or stored here: they live in Convex → Settings → Environment Variables.</p>

      <div className="settings-list">
        <div className="settings-row">
          <label>Usage</label>
          <p>Today: <b>{fmt(usage.today.messages)}</b> messages from {usage.today.students} students · {fmt(usage.today.tokensIn + usage.today.tokensOut)} tokens · ${usage.today.costUsd.toFixed(4)}</p>
          <p>This month: <b>{fmt(usage.month.messages)}</b> messages · {fmt(usage.month.tokensIn + usage.month.tokensOut)} tokens · ${usage.month.costUsd.toFixed(4)}
            {usage.capPct !== null && <> · <b>{usage.capPct}% of the monthly cap</b></>}</p>
          {usage.capState === "warning" && <p style={{ color: "#a15c00" }}>Warning: 70% of the monthly token cap is used.</p>}
          {usage.capState === "critical" && <p style={{ color: "#b45309" }}>Warning: 90% of the monthly token cap is used.</p>}
          {usage.capState === "limited" && <p style={{ color: "#b91c1c" }}>Cap reached: Kody is showing "temporarily limited" to students. Raise the cap to resume.</p>}
        </div>

        {row("Kody is on", <label style={{ fontWeight: 400 }}><input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Untick to switch Kody off for everyone immediately (kill switch)</label>)}
        {row("Provider", (
          <div className="settings-row__input">
            <select value={f.provider} onChange={(e) => set("provider", e.target.value as Form["provider"])}>
              <option value="requesty">Requesty (development and testing)</option>
              <option value="anthropic">Anthropic API (production)</option>
              <option value="custom">Other OpenAI-compatible</option>
            </select>
          </div>
        ), keyOk ? "A key is set in Convex for this provider." : `No key found yet. Add ${KEY_NAME[f.provider]} in the Convex dashboard.`)}
        {row("Chat model ID", input("modelChat", "e.g. an ID copied from Requesty's model list"), "Requesty IDs look like provider/model (copy from their model list). Anthropic IDs look like claude-haiku-5-5. Paid models, including Claude, need credit.")}
        {row("Fallback model ID (optional)", input("modelFallback"), "Used once if the chat model fails or is rate-limited.")}
        {row("Grading model ID", input("modelGrading"), "Used from Phase 5. Don't use a free model for certificates.")}
        {row("Daily messages per Free student", input("dailyFree"))}
        {row("Daily messages per Pro student (and staff)", input("dailyPro"))}
        {row("Monthly token cap (0 = no cap)", input("monthlyTokenCap"), "Input + output tokens for the whole platform. Warns at 70% and 90%; at 100% Kody pauses.")}
        {row("Price per million input tokens (USD)", input("priceInPerM"), "Only used to fill the cost log. 0 for free models.")}
        {row("Price per million output tokens (USD)", input("priceOutPerM"))}
        {row("Max reply length (tokens)", input("maxOutputTokens"), "100 to 4000. Shorter is cheaper.")}
      </div>

      <div style={{ display: "flex", gap: ".6rem", margin: "1rem 0", flexWrap: "wrap" }}>
        <button className="btn btn-primary" disabled={busy} onClick={onSave}>Save settings</button>
        <button className="btn" disabled={busy} onClick={() => onTest("chat")}>Test chat model</button>
        <button className="btn" disabled={busy || !f.modelFallback} onClick={() => onTest("fallback")}>Test fallback model</button>
      </div>
      {msg && <p role="status" style={{ color: msg.ok ? "#15803d" : "#b91c1c" }}>{msg.text}</p>}
    </div>
  );
}
