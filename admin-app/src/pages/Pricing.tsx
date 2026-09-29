import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ResourceTable from "../components/ResourceTable";
import Modal from "../components/Modal";

type Row = {
  _id: string; checker: "website" | "mobile"; name: string; minScore: number;
  priceRange: string; description: string; timeline: string; approach: string; order: number;
};
const BLANK = { checker: "website" as Row["checker"], name: "", minScore: 0, priceRange: "", description: "", timeline: "", approach: "", order: 0 };

export default function Pricing() {
  const rows = useQuery(api.adminContent.listPricingTiersAdmin, {}) as Row[] | undefined;
  const save = useMutation(api.adminContent.savePricingTier);
  const del = useMutation(api.adminContent.deletePricingTier);
  const [editing, setEditing] = useState<Row | null | typeof BLANK>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save({
      id: (editing as Row)?._id as any,
      checker: f.get("checker") as Row["checker"],
      name: String(f.get("name")),
      minScore: Number(f.get("minScore") || 0),
      priceRange: String(f.get("priceRange")),
      description: String(f.get("description")),
      timeline: String(f.get("timeline")),
      approach: String(f.get("approach")),
      order: Number(f.get("order") || 0),
    });
    setEditing(null);
  }

  return (
    <div>
      <h1>Pricing tiers</h1>
      <p className="muted">
        Powers the live pricing checker on the Website Development and Mobile App Development pages.
        <br />These currently ship as placeholder numbers hardcoded in <code>assets/js/pricing-data.js</code> on
        the main site — wiring the checker to read from here instead is a follow-up step, not done yet.
      </p>
      <ResourceTable<Row>
        rows={rows} addLabel="pricing tier" onAdd={() => setEditing(BLANK as any)} onEdit={setEditing}
        onDelete={(r) => confirm(`Delete "${r.name}"?`) && del({ id: r._id as any })}
        columns={[
          { key: "checker", label: "Checker" }, { key: "name", label: "Tier" },
          { key: "priceRange", label: "Price range" }, { key: "minScore", label: "Min score" }, { key: "order", label: "Order" },
        ]}
      />
      {editing && (
        <Modal title={(editing as Row)._id ? "Edit pricing tier" : "Add pricing tier"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="form-grid">
            <label>Checker
              <select name="checker" defaultValue={editing.checker}>
                <option value="website">Website</option>
                <option value="mobile">Mobile</option>
              </select>
            </label>
            <label>Tier name<input name="name" defaultValue={editing.name} required /></label>
            <label>Min score (threshold)<input name="minScore" type="number" defaultValue={editing.minScore} /></label>
            <label>Order<input name="order" type="number" defaultValue={editing.order} /></label>
            <label>Price range<input name="priceRange" defaultValue={editing.priceRange} placeholder="$800 – $1,800" required /></label>
            <label>Timeline<input name="timeline" defaultValue={editing.timeline} placeholder="2–3 weeks" required /></label>
            <label className="wide">Approach<input name="approach" defaultValue={editing.approach} placeholder="Static/CMS build" required /></label>
            <label className="wide">Description<textarea name="description" defaultValue={editing.description} required /></label>
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
