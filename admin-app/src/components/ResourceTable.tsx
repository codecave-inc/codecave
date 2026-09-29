type Column<T> = { key: string; label: string; render?: (row: T) => React.ReactNode };

export default function ResourceTable<T extends { _id: string }>({
  columns, rows, onEdit, onDelete, onAdd, addLabel, loading,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  onAdd: () => void;
  addLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="resource-table">
      <div className="resource-table__head">
        <button className="btn btn-primary" onClick={onAdd}>+ {addLabel}</button>
      </div>
      {rows === undefined ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : (row as any)[c.key]}</td>)}
                <td className="row-actions">
                  <button className="link-btn" onClick={() => onEdit(row)}>Edit</button>
                  <button className="link-btn link-btn--danger" onClick={() => onDelete(row)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
