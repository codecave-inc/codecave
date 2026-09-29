import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import ResourceTable from "../components/ResourceTable";
import Modal from "../components/Modal";

type Row = { _id: string; question: string; answer: string; order: number; published: boolean };
const BLANK = { question: "", answer: "", order: 0, published: true };

export default function Faq() {
  const rows = useQuery(api.adminContent.listFaqAdmin, {}) as Row[] | undefined;
  const save = useMutation(api.adminContent.saveFaqEntry);
  const del = useMutation(api.adminContent.deleteFaqEntry);
  const [editing, setEditing] = useState<Row | null | typeof BLANK>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await save({
      id: (editing as Row)?._id as any,
      question: String(f.get("question")),
      answer: String(f.get("answer")),
      order: Number(f.get("order") || 0),
      published: f.get("published") === "on",
    });
    setEditing(null);
  }

  return (
    <div>
      <h1>FAQ</h1>
      <p className="muted">Shown on the Contact page.</p>
      <ResourceTable<Row>
        rows={rows} addLabel="FAQ entry" onAdd={() => setEditing(BLANK as any)} onEdit={setEditing}
        onDelete={(r) => confirm(`Delete this FAQ entry?`) && del({ id: r._id as any })}
        columns={[{ key: "question", label: "Question" }, { key: "order", label: "Order" }, { key: "published", label: "Published", render: (r) => (r.published ? "Yes" : "No") }]}
      />
      {editing && (
        <Modal title={(editing as Row)._id ? "Edit FAQ entry" : "Add FAQ entry"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="form-grid">
            <label className="wide">Question<input name="question" defaultValue={editing.question} required /></label>
            <label className="wide">Answer<textarea name="answer" defaultValue={editing.answer} required /></label>
            <label>Order<input name="order" type="number" defaultValue={editing.order} /></label>
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
