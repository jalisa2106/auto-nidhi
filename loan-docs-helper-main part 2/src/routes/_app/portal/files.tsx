import { createFileRoute, Link } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { mockFiles } from "@/lib/mockData";

export const Route = createFileRoute("/_app/portal/files")({ component: Page });

function Page() {
  const files = mockFiles.slice(0, 3);
  return (
    <>
      <PageHeader title="My files" subtitle="All your loan & insurance files" />
      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>File</th><th>Type</th><th>Status</th><th>Bank / Insurer</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.type}</td>
                <td><span className="badge badge-blue">{f.status}</span></td>
                <td>{f.bank}</td>
                <td>{f.created}</td>
                <td><Link to="/portal/files/$id" params={{ id: f.id }} className="auth-link">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
