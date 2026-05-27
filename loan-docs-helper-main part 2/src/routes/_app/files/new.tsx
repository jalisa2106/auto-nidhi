import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";

export const Route = createFileRoute("/_app/files/new")({ component: NewFilePage });

const steps = ["Customer & file", "Vehicle", "Finance", "Insurance", "RTO"];

function NewFilePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  return (
    <>
      <PageHeader title="New file" subtitle="Create a draft and fill section-by-section"
        actions={<Link to="/files" className="btn btn-ghost btn-sm">Cancel</Link>} />
      <div className="section-card">
        <div className="tabs">{steps.map((s, i) => (
          <button key={s} className={`tab ${i === step ? "active" : ""}`} onClick={() => setStep(i)}>{i + 1}. {s}</button>
        ))}</div>
        {step === 0 && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">Customer</label><input className="form-input" placeholder="Search customer..." /></div>
            <div className="form-group"><label className="form-label">File type</label>
              <select className="form-select"><option>NEW</option><option>USED</option><option>RENEWAL</option></select>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">Model</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Vehicle no.</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Chassis</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Engine</label><input className="form-input" /></div>
          </div>
        )}
        {step === 2 && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">Bank</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Loan amount</label><input className="form-input" type="number" /></div>
            <div className="form-group"><label className="form-label">Tenure (months)</label><input className="form-input" type="number" /></div>
            <div className="form-group"><label className="form-label">EMI</label><input className="form-input" type="number" /></div>
          </div>
        )}
        {step === 3 && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">Insurance company</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Policy no.</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Valid from</label><input type="date" className="form-input" /></div>
            <div className="form-group"><label className="form-label">Valid to</label><input type="date" className="form-input" /></div>
          </div>
        )}
        {step === 4 && (
          <div className="form-row">
            <div className="form-group"><label className="form-label">RTO office</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Registration no.</label><input className="form-input" /></div>
            <div className="form-group"><label className="form-label">Road tax</label><input className="form-input" type="number" /></div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <button className="btn btn-ghost btn-sm" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          {step < steps.length - 1
            ? <button className="btn btn-primary btn-sm" onClick={() => setStep(step + 1)}>Next →</button>
            : <button className="btn btn-primary btn-sm" onClick={() => router.navigate({ to: "/files" })}>Save draft</button>}
        </div>
      </div>
    </>
  );
}
