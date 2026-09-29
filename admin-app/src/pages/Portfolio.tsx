import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import ResourceTable from "../components/ResourceTable";
import Modal from "../components/Modal";

type Row = {
  _id: string; title: string; description: string;
  category: "website" | "mobile" | "automation" | "training";
  tags: string[]; imageUrl?: string; linkUrl?: string; published: boolean; order: number;
};

const BLANK = { title: "", description: "", category: "website" as Row["category"], tags: "", imageUrl: "", linkUrl: "", published: false, order: 0 };

export default function Portfolio() {
  const rows = useQuery(api.adminContent.listPortfolioAdmin, {}) as Row[] | undefined;
  const save = useMutation(api.adminContent.savePortfolioItem);
  const del = useMutation(api.adminContent.deletePortfolioItem);
  const [editing, setEditing] = useState<Row | null | typeof BLANK>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save({
      id: (editing as Row)?._id as any,
      title: String(f.get("title")),
      description: String(f.get("description")),
      category: f.get("category") as Row["category"],
      tags: String(f.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
      imageUrl: String(f.get("imageUrl") || "") || undefined,
      linkUrl: String(f.get("linkUrl") || "") || undefined,
      published: f.get("published") === "on",
      order: Number(f.get("order") || 0),
    });
    setEditing(null);
  }

  return (
    <div>
      <h1>Portfolio</h1>
      <p className="muted">Shown in the portfolio grids on the Website, Mobile and Automation pages.</p>
      <ResourceTable<Row>
        rows={rows}
        addLabel="portfolio item"
        onAdd={() => setEditing(BLANK as any)}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => confirm(`Delete "${r.title}"?`) && del({ id: r._id as any })}
        columns={[
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "tags", label: "Tags", render: (r) => r.tags.join(", ") },
          { key: "published", label: "Published", render: (r) => (r.published ? "Yes" : "No") },
          { key: "order", label: "Order" },
        ]}
      />
      {editing && (
        <Modal title={(editing as Row)._id ? "Edit portfolio item" : "Add portfolio item"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="form-grid">
            <label>Title<input name="title" defaultValue={editing.title} required /></label>
            <label>Category
              <select name="category" defaultValue={editing.category}>
                <option value="website">Website</option>
                <option value="mobile">Mobile</option>
                <option value="automation">Automation</option>
                <option value="training">Training</option>
              </select>
            </label>
            <label className="wide">Description<textarea name="description" defaultValue={editing.description} required /></label>
            <label>Tags (comma separated)<input name="tags" defaultValue={editing.tags?.join(", ") ?? ""} placeholder="lms, ecommerce" /></label>
            <label>Order<input name="order" type="number" defaultValue={editing.order} /></label>
            <label>Image URL (optional)<input name="imageUrl" defaultValue={editing.imageUrl ?? ""} /></label>
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
