import { createFileRoute, Link } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { mockFiles, mockPaymentsIn } from "@/lib/mockData";
import { CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/portal/files/$id")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const f = mockFiles.find((x) => x.id === id);
  if (!f) return <div className="section-card">Not found</div>;
  const pays = mockPaymentsIn.filter((p) => p.file === id);
  return (
    <>
      <PageHeader title={`File ${f.id}`} subtitle={f.type} actions={<Link to="/portal/files" className="btn btn-ghost btn-sm">Back</Link>} />
      <div className="section-card">
        <h3>Summary</h3>
        <div className="form-row">
          <KV k="Status" v={<span className="badge badge-blue">{f.status}</span>} />
          <KV k="Bank" v={f.bank} />
          <KV k="Created" v={f.created} />
        </div>
      </div>
      <div className="section-card">
        <h3>Progress</h3>
        {["Application received", "Documents verified", "Sent to bank", "Sanctioned", "Disbursed"].map((s, i) => (
          <div key={s} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
            <span className={`badge ${i <= 2 ? "badge-green" : "badge-gray"}`}>{i <= 2 ? <CheckCircle2 size={12} /> : <Clock size={12} />}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div className="section-card">
        <h3>Payments</h3>
        {pays.length === 0 ? <div className="data-empty">No payments yet.</div> : (
          <table className="data-table">
            <thead><tr><th>ID</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
            <tbody>{pays.map((p) => <tr key={p.id}><td>{p.id}</td><td>₹{p.amount.toLocaleString()}</td><td>{p.mode}</td><td>{p.date}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <div className="section-card">
        <h3>Insurance</h3>
        <div className="form-row">
          <KV k="Insurer" v="New India Assurance" />
          <KV k="Policy" v="NIA/2025/123456" />
          <KV k="Valid till" v="2026-10-11" />
          <KV k="Premium" v="₹22,500" />
        </div>
      </div>
    </>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="form-group">
      <div style={{ fontSize: ".75rem", color: "var(--gray-500)", marginBottom: 4 }}>{k}</div>
      <div style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}
