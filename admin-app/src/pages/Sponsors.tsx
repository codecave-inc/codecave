import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import ResourceTable from "../components/ResourceTable";
import Modal from "../components/Modal";

type Row = { _id: string; name: string; kind: "individual" | "organisation"; rank?: number; logoUrl?: string; linkUrl?: string; published: boolean };
const BLANK = { name: "", kind: "organisation" as Row["kind"], rank: "", logoUrl: "", linkUrl: "", published: true };

export default function Sponsors() {
  const rows = useQuery(api.adminContent.listSponsorsAdmin, {}) as Row[] | undefined;
  const save = useMutation(api.adminContent.saveSponsor);
  const del = useMutation(api.adminContent.deleteSponsor);
  const [editing, setEditing] = useState<Row | null | typeof BLANK>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const rank = f.get("rank");
    await save({
      id: (editing as Row)?._id as any,
      name: String(f.get("name")),
      kind: f.get("kind") as Row["kind"],
      rank: rank ? Number(rank) : undefined,
      logoUrl: String(f.get("logoUrl") || "") || undefined,
      linkUrl: String(f.get("linkUrl") || "") || undefined,
      published: f.get("published") === "on",
    });
    setEditing(null);
  }

  return (
    <div>
      <h1>Sponsors</h1>
      <p className="muted">Powers the Sponsor Initiatives recognition wall. Rank 1–3 shows on the podium; leave blank for unranked.</p>
      <ResourceTable<Row>
        rows={rows} addLabel="sponsor" onAdd={() => setEditing(BLANK as any)} onEdit={setEditing}
        onDelete={(r) => confirm(`Delete "${r.name}"?`) && del({ id: r._id as any })}
        columns={[
          { key: "name", label: "Name" }, { key: "kind", label: "Kind" },
          { key: "rank", label: "Rank", render: (r) => r.rank ?? "—" },
          { key: "published", label: "Published", render: (r) => (r.published ? "Yes" : "No") },
        ]}
      />
      {editing && (
        <Modal title={(editing as Row)._id ? "Edit sponsor" : "Add sponsor"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="form-grid">
            <label>Name<input name="name" defaultValue={editing.name} required /></label>
            <label>Kind
              <select name="kind" defaultValue={editing.kind}>
                <option value="organisation">Organisation</option>
                <option value="individual">Individual</option>
              </select>
            </label>
            <label>Rank (1–3, optional)<input name="rank" type="number" min={1} max={3} defaultValue={editing.rank ?? ""} /></label>
            <label>Logo URL (optional)<input name="logoUrl" defaultValue={editing.logoUrl ?? ""} /></label>
            <label>Link URL (optional)<input name="linkUrl" defaultValue={editing.linkUrl ?? ""} /></label>
            <label className="checkbox-label"><input name="published" type="checkbox" defaultChecked={editing.published} /> Published</label>
            <div className="wide form-actions">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
