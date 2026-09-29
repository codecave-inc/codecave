import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

const KNOWN_KEYS = [
  { key: "hackathonDate", label: "Hackathon 27 date (ISO format)", placeholder: "2027-03-14T09:00:00Z" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "contactAddress", label: "Contact address" },
  { key: "homepageStatStudents", label: "Homepage stat — students trained", placeholder: "500+" },
  { key: "homepageStatProducts", label: "Homepage stat — products shipped", placeholder: "25+" },
  { key: "homepageStatHubs", label: "Homepage stat — campus hubs", placeholder: "12+" },
  { key: "homepageStatSatisfaction", label: "Homepage stat — client satisfaction", placeholder: "99.8%" },
] as const;

export default function Settings() {
  const rows = useQuery(api.adminContent.listSettingsAdmin, {});
  const save = useMutation(api.adminContent.saveSetting);
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  if (rows === undefined) return <p className="muted">Loading…</p>;
  const valueFor = (key: string) => dirty[key] ?? rows.find((r: any) => r.key === key)?.value ?? "";

  async function handleSave(key: string) {
    await save({ key, value: dirty[key] ?? valueFor(key) });
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  }

  return (
    <div>
      <h1>Settings</h1>
      <p className="muted">
        Misc site values. <br />Note: these are stored in Convex, but the public site currently still reads
        most of these from <code>assets/js/config.js</code> and <code>index.html</code> directly — wiring the
        site to read live from here is a follow-up step, not done yet.
      </p>
      <div className="settings-list">
        {KNOWN_KEYS.map((k) => (
          <div className="settings-row" key={k.key}>
            <label>{k.label}</label>
            <div className="settings-row__input">
              <input
                value={valueFor(k.key)}
                placeholder={k.placeholder}
                onChange={(e) => setDirty((d) => ({ ...d, [k.key]: e.target.value }))}
              />
              <button className="btn" onClick={() => handleSave(k.key)}>
                {saved === k.key ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
