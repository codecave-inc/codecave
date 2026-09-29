import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

type StatusFilter = "new" | "read" | "archived" | undefined;

const TABLES = [
  { key: "contactMessages", label: "Contact messages",
    list: api.adminSubmissions.listContactMessages, updateStatus: api.adminSubmissions.updateContactMessageStatus, remove: api.adminSubmissions.removeContactMessage,
    columns: ["fullName", "email", "subject", "message"] },
  { key: "projectBriefs", label: "Project briefs",
    list: api.adminSubmissions.listProjectBriefs, updateStatus: api.adminSubmissions.updateProjectBriefStatus, remove: api.adminSubmissions.removeProjectBrief,
    columns: ["name", "email", "projectType", "tierEstimate", "details"] },
  { key: "trainingApplications", label: "Training applications",
    list: api.adminSubmissions.listTrainingApplications, updateStatus: api.adminSubmissions.updateTrainingApplicationStatus, remove: api.adminSubmissions.removeTrainingApplication,
    columns: ["fullName", "email", "program", "track", "organisation"] },
  { key: "hackathonWaitlist", label: "Hackathon 27 waitlist",
    list: api.adminSubmissions.listHackathonWaitlist, updateStatus: api.adminSubmissions.updateHackathonWaitlistStatus, remove: api.adminSubmissions.removeHackathonWaitlist,
    columns: ["fullName", "email", "role", "school"] },
  { key: "ambassadorApplications", label: "Ambassador applications",
    list: api.adminSubmissions.listAmbassadorApplications, updateStatus: api.adminSubmissions.updateAmbassadorApplicationStatus, remove: api.adminSubmissions.removeAmbassadorApplication,
    columns: ["fullName", "email", "school", "whyYou"] },
  { key: "partnershipProposals", label: "Partnership proposals",
    list: api.adminSubmissions.listPartnershipProposals, updateStatus: api.adminSubmissions.updatePartnershipProposalStatus, remove: api.adminSubmissions.removePartnershipProposal,
    columns: ["contactName", "email", "organisation", "partnershipType", "details"] },
  { key: "sponsorInquiries", label: "Sponsor inquiries",
    list: api.adminSubmissions.listSponsorInquiries, updateStatus: api.adminSubmissions.updateSponsorInquiryStatus, remove: api.adminSubmissions.removeSponsorInquiry,
    columns: ["contactName", "email", "sponsorType", "initiative"] },
  { key: "productNotify", label: "Product notify-me",
    list: api.adminSubmissions.listProductNotify, updateStatus: api.adminSubmissions.updateProductNotifyStatus, remove: api.adminSubmissions.removeProductNotify,
    columns: ["email", "product"] },
] as const;

export default function Submissions({ counts }: { counts: Record<string, number> | undefined }) {
  const [active, setActive] = useState<(typeof TABLES)[number]["key"]>("contactMessages");
  const [filter, setFilter] = useState<StatusFilter>("new");
  const table = TABLES.find((t) => t.key === active)!;

  const rows = useQuery(table.list, { status: filter });
  const updateStatus = useMutation(table.updateStatus);
  const remove = useMutation(table.remove);

  return (
    <div>
      <h1>Submissions</h1>
      <div className="tab-row">
        {TABLES.map((t) => (
          <button key={t.key} className={"tab" + (active === t.key ? " is-active" : "")} onClick={() => setActive(t.key)}>
            {t.label}{counts?.[t.key] ? <span className="badge">{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>
      <div className="filter-row">
        {(["new", "read", "archived", undefined] as StatusFilter[]).map((s) => (
          <button key={s ?? "all"} className={"chip" + (filter === s ? " is-active" : "")} onClick={() => setFilter(s)}>
            {s ?? "All"}
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No submissions here.</p>
      ) : (
        <div className="submission-list">
          {rows.map((row: any) => (
            <div className="submission-card" key={row._id}>
              <div className="submission-card__head">
                <span className={"status-dot status-dot--" + row.status} />
                <strong>{new Date(row.submittedAt).toLocaleString()}</strong>
                <span className="muted">from {row.source || "unknown page"}</span>
              </div>
              <dl className="submission-card__fields">
                {table.columns.map((c) => row[c] ? (
                  <div key={c}>
                    <dt>{c}</dt>
                    <dd>{String(row[c])}</dd>
                  </div>
                ) : null)}
              </dl>
              <div className="submission-card__actions">
                {row.status !== "read" && <button className="link-btn" onClick={() => updateStatus({ id: row._id, status: "read" })}>Mark read</button>}
                {row.status !== "archived" && <button className="link-btn" onClick={() => updateStatus({ id: row._id, status: "archived" })}>Archive</button>}
                {row.status !== "new" && <button className="link-btn" onClick={() => updateStatus({ id: row._id, status: "new" })}>Mark new</button>}
                <button className="link-btn link-btn--danger" onClick={() => confirm("Delete this submission?") && remove({ id: row._id })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
