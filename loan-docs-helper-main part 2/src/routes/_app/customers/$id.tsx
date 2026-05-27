import { createFileRoute, Link } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { mockCustomers, mockFiles } from "@/lib/mockData";

export const Route = createFileRoute("/_app/customers/$id")({ component: CustomerDetail });

function CustomerDetail() {
  const { id } = Route.useParams();
  const c = mockCustomers.find((x) => x.id === id);
  if (!c) return <div className="section-card">Customer not found.</div>;
  const files = mockFiles.filter((f) => f.customer === c.name);
  return (
    <>
      <PageHeader title={c.name} subtitle={`Customer ${c.id}`} actions={<Link to="/customers" className="btn btn-ghost btn-sm">Back</Link>} />
      <div className="section-card">
        <h3>Profile</h3>
        <div className="form-row"><div><b>Mobile:</b> {c.mobile}</div><div><b>City:</b> {c.city}</div></div>
        <div style={{ marginTop: 8 }}><b>Created:</b> {c.created}</div>
      </div>
      <div className="section-card">
        <h3>Linked files</h3>
        {files.length === 0 ? <div className="data-empty">No files yet</div> : (
          <table className="data-table"><thead><tr><th>File</th><th>Type</th><th>Status</th><th>Bank</th></tr></thead>
            <tbody>{files.map((f) => <tr key={f.id}><td>{f.id}</td><td>{f.type}</td><td>{f.status}</td><td>{f.bank}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
