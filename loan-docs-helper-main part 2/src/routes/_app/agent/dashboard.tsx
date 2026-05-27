import { createFileRoute, Link } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { mockFiles, fileStatuses } from "@/lib/mockData";

export const Route = createFileRoute("/_app/agent/dashboard")({ component: Page });

function Page() {
  const myFiles = mockFiles.slice(0, 3);
  const byStatus = fileStatuses.map((s) => ({ s, n: myFiles.filter((f) => f.status === s).length }));
  return (
    <>
      <PageHeader title="Agent dashboard" subtitle="Your pipeline & commissions" />
      <div className="stats-grid">
        <StatCard label="Open files" value={myFiles.filter((f) => f.status !== "Completed" && f.status !== "Cancelled").length} delta="+2 this week" up />
        <StatCard label="Disbursed (MTD)" value={1} />
        <StatCard label="Commission receivable" value="₹42,500" />
        <StatCard label="Commission received" value="₹1.2L" delta="+18%" up />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="section-card">
          <h3>My pipeline</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            {byStatus.map((b) => (
              <div key={b.s} style={{ padding: 14, background: "var(--surface-1)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--brand-700)" }}>{b.n}</div>
                <div style={{ fontSize: ".78rem", color: "var(--gray-500)", fontWeight: 600 }}>{b.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="section-card">
          <h3>Quick actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link to="/agent/customers" className="btn btn-ghost btn-sm">View my customers</Link>
            <Link to="/agent/files" className="btn btn-ghost btn-sm">View my files</Link>
            <Link to="/agent/commissions" className="btn btn-ghost btn-sm">View commissions</Link>
          </div>
        </div>
      </div>
    </>
  );
}
