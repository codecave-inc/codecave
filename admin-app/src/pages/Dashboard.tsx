import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Submissions from "./Submissions";
import Portfolio from "./Portfolio";
import Sponsors from "./Sponsors";
import Faq from "./Faq";
import Pricing from "./Pricing";
import Settings from "./Settings";
import Courses from "./Courses";
import Comments from "./Comments";

const NAV = [
  { key: "courses", label: "Academy courses", needs: "content" },
  { key: "comments", label: "Lesson comments", needs: "moderate" },
  { key: "submissions", label: "Submissions" },
  { key: "portfolio", label: "Portfolio" },
  { key: "sponsors", label: "Sponsors" },
  { key: "faq", label: "FAQ" },
  { key: "pricing", label: "Pricing tiers" },
  { key: "settings", label: "Settings" },
] as { key: string; label: string; needs?: "content" | "moderate" }[];

type Tab = string;

type Me = { email: string | null; role: string; canManageSite: boolean; canManageContent: boolean; canModerate: boolean };

export default function Dashboard({ me }: { me: Me }) {
  // Show each person only what their role can use. (The server checks too.)
  const nav = NAV.filter((n) => (n.needs === "content" ? me.canManageContent : n.needs === "moderate" ? me.canModerate : me.canManageSite));
  const [tab, setTab] = useState<Tab>(me.canManageSite ? "submissions" : me.canManageContent ? "courses" : "comments");
  const { signOut } = useAuthActions();
  const counts = useQuery(api.adminSubmissions.countNewByTable, me.canManageSite ? {} : "skip");
  const totalNew = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">CodeCave Admin</div>
        <nav>
          {nav.map((n) => (
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
        {nav.length === 0 && <p>Your role doesn't have any admin screens yet.</p>}
        {tab === "courses" && me.canManageContent && <Courses canDelete={me.canManageSite} />}
        {tab === "comments" && me.canModerate && <Comments />}
        {tab === "submissions" && me.canManageSite && <Submissions counts={counts} />}
        {tab === "portfolio" && me.canManageSite && <Portfolio />}
        {tab === "sponsors" && me.canManageSite && <Sponsors />}
        {tab === "faq" && me.canManageSite && <Faq />}
        {tab === "pricing" && me.canManageSite && <Pricing />}
        {tab === "settings" && me.canManageSite && <Settings />}
      </main>
    </div>
  );
}
