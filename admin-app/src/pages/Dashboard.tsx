import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Submissions from "./Submissions";
import Portfolio from "./Portfolio";
import Sponsors from "./Sponsors";
import Faq from "./Faq";
import Pricing from "./Pricing";
import Settings from "./Settings";

const NAV = [
  { key: "submissions", label: "Submissions" },
  { key: "portfolio", label: "Portfolio" },
  { key: "sponsors", label: "Sponsors" },
  { key: "faq", label: "FAQ" },
  { key: "pricing", label: "Pricing tiers" },
  { key: "settings", label: "Settings" },
] as const;

type Tab = (typeof NAV)[number]["key"];

export default function Dashboard({ me }: { me: { email: string | null; role: string } }) {
  const [tab, setTab] = useState<Tab>("submissions");
  const { signOut } = useAuthActions();
  const counts = useQuery(api.adminSubmissions.countNewByTable, {});
  const totalNew = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">CodeCave Admin</div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={"sidebar__link" + (tab === n.key ? " is-active" : "")}
              onClick={() => setTab(n.key)}
            >
              {n.label}
              {n.key === "submissions" && totalNew > 0 && <span className="badge">{totalNew}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          <div className="muted" style={{ fontSize: ".8rem" }}>{me.email} · {me.role}</div>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="content">
        {tab === "submissions" && <Submissions counts={counts} />}
        {tab === "portfolio" && <Portfolio />}
        {tab === "sponsors" && <Sponsors />}
        {tab === "faq" && <Faq />}
        {tab === "pricing" && <Pricing />}
        {tab === "settings" && <Settings />}
      </main>
    </div>
  );
}
