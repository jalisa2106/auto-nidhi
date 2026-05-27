import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import PageHeader from "@/components/app/PageHeader";
import { mockFiles, fileStatuses, mockPaymentsIn, mockPaymentsOut } from "@/lib/mockData";

export const Route = createFileRoute("/_app/files/$id")({ component: FileDetail });

const tabs = ["Overview", "Customer", "Vehicle", "Finance", "Insurance", "RTO", "Documents", "Payments"];

function FileDetail() {
  const { id } = Route.useParams();
  const f = mockFiles.find((x) => x.id === id);
  const [tab, setTab] = useState("Overview");
  if (!f) return <div className="section-card">File not found.</div>;

  const payments = [
    ...mockPaymentsIn.filter((p) => p.file === id).map((p) => ({ ...p, dir: "IN" })),
    ...mockPaymentsOut.filter((p) => p.file === id).map((p) => ({ ...p, dir: "OUT" })),
  ];

  return (
    <>
      <PageHeader
        title={`File ${f.id}`}
        subtitle={`${f.type} • ${f.customer}`}
        actions={<Link to="/files" className="btn btn-ghost btn-sm">Back</Link>}
      />

      <div className="section-card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <KV k="Status" v={<span className="badge badge-blue">{f.status}</span>} />
          <KV k="Customer" v={f.customer} />
          <KV k="Bank / Insurer" v={f.bank} />
          <KV k="Assigned to" v={f.assigned} />
          <KV k="Created" v={f.created} />
          <div>
            <div style={{ fontSize: ".75rem", color: "var(--gray-500)", marginBottom: 4 }}>Change status</div>
            <select className="form-select" defaultValue={f.status}>
              {fileStatuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="tabs">{tabs.map((t) => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>

      {tab === "Overview" && (
        <div className="section-card">
          <h3>Timeline</h3>
          {["Draft created", "Documents uploaded", "Sent to bank", "Sanctioned", "Disbursed"].map((s, i) => (
            <div key={s} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <span className={`badge ${i <= 3 ? "badge-green" : "badge-gray"}`}>{i <= 3 ? <CheckCircle2 size={12} /> : <Clock size={12} />}</span>
              <div style={{ flex: 1 }}>{s}</div>
              <div style={{ fontSize: ".78rem", color: "var(--gray-500)" }}>{i <= 3 ? "2025-10-0" + (i + 1) : "Pending"}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "Customer" && (
        <div className="section-card">
          <div className="form-row">
            <Field label="Name" value={f.customer} />
            <Field label="Mobile" value="9876543210" />
            <Field label="Email" value="customer@example.com" />
            <Field label="PAN" value="ABCDE1234F" />
            <Field label="Aadhaar" value="XXXX XXXX 1234" />
            <Field label="Address" value="Pune, MH" />
          </div>
        </div>
      )}

      {tab === "Vehicle" && (
        <div className="section-card">
          <div className="form-row">
            <Field label="Category" value="Car" />
            <Field label="Make" value="Maruti" />
            <Field label="Model" value="Swift VXi" />
            <Field label="Year" value="2024" />
            <Field label="Chassis No." value="MA3EXKD1S00123456" />
            <Field label="Engine No." value="K12NN1234567" />
            <Field label="Registration No." value="MH12AB1234" />
            <Field label="Ex-showroom" value="₹7,40,000" />
            <Field label="On-road" value="₹8,55,000" />
          </div>
        </div>
      )}

      {tab === "Finance" && (
        <div className="section-card">
          <div className="form-row">
            <Field label="Bank" value={f.bank} />
            <Field label="Loan amount" value="₹6,50,000" />
            <Field label="Tenure (months)" value="60" />
            <Field label="EMI" value="₹13,950" />
            <Field label="Rate of interest" value="9.5%" />
            <Field label="Disbursement date" value="2025-10-12" />
            <Field label="Bank commission (%)" value="2.0%" />
            <Field label="Commission amount" value="₹13,000" />
          </div>
        </div>
      )}

      {tab === "Insurance" && (
        <div className="section-card">
          <div className="form-row">
            <Field label="Insurance company" value="New India Assurance" />
            <Field label="Policy type" value="Comprehensive" />
            <Field label="Policy no." value="NIA/2025/123456" />
            <Field label="Start date" value="2025-10-12" />
            <Field label="End date" value="2026-10-11" />
            <Field label="Premium" value="₹22,500" />
            <Field label="Nominee" value="Spouse" />
          </div>
        </div>
      )}

      {tab === "RTO" && (
        <div className="section-card">
          <div className="form-row">
            <Field label="RTO office" value="RTO Pune" />
            <Field label="Registration no." value="MH12AB1234" />
            <Field label="Registration date" value="2025-10-15" />
            <Field label="Road tax" value="₹52,500" />
            <Field label="Smart card status" value="Issued" />
            <Field label="Hypothecation" value="HDFC Bank Ltd" />
          </div>
        </div>
      )}

      {tab === "Documents" && (
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Documents</h3>
            <button className="btn btn-primary btn-sm"><Upload size={14} /> Upload</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Document</th><th>Uploaded</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {[
                { n: "PAN Card", d: "2025-10-04", s: "Verified" },
                { n: "Aadhaar", d: "2025-10-04", s: "Verified" },
                { n: "Bank Statement", d: "2025-10-05", s: "Pending" },
                { n: "ITR", d: "—", s: "Missing" },
              ].map((d) => (
                <tr key={d.n}>
                  <td><FileText size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />{d.n}</td>
                  <td>{d.d}</td>
                  <td>
                    {d.s === "Verified" && <span className="badge badge-green"><CheckCircle2 size={12} /> {d.s}</span>}
                    {d.s === "Pending" && <span className="badge badge-gold"><Clock size={12} /> {d.s}</span>}
                    {d.s === "Missing" && <span className="badge badge-red"><XCircle size={12} /> {d.s}</span>}
                  </td>
                  <td><button className="btn btn-ghost btn-sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Payments" && (
        <div className="section-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3>Payments for {f.id}</h3>
            <button className="btn btn-primary btn-sm"><Plus size={14} /> Record payment</button>
          </div>
          {payments.length === 0 ? <div className="data-empty">No payments yet.</div> : (
            <table className="data-table">
              <thead><tr><th>ID</th><th>Direction</th><th>Party</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
              <tbody>{payments.map((p: any) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><span className={`badge ${p.dir === "IN" ? "badge-green" : "badge-gold"}`}>{p.dir}</span></td>
                  <td>{p.from || p.payee}</td>
                  <td>₹{p.amount.toLocaleString()}</td>
                  <td>{p.mode}</td>
                  <td>{p.date}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: ".75rem", color: "var(--gray-500)", marginBottom: 4 }}>{k}</div>
      <div style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" defaultValue={value} />
    </div>
  );
}
