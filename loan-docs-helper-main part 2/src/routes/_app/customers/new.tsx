import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";

export const Route = createFileRoute("/_app/customers/new")({ component: NewCustomer });

function NewCustomer() {
  const router = useRouter();
  const [form, setForm] = useState({
    first: "", last: "", mobile: "", email: "", city: "", state: "", pincode: "",
    pan: "", aadhaar: "", address: "", type: "Individual",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first || !form.mobile) return;
    router.navigate({ to: "/customers" });
  };
  return (
    <>
      <PageHeader title="New customer" subtitle="Onboard a new customer with KYC" actions={<Link to="/customers" className="btn btn-ghost btn-sm">Cancel</Link>} />
      <form onSubmit={submit} className="section-card">
        <h3>Personal details</h3>
        <div className="form-row">
          <div className="form-group"><label className="form-label">First name<span className="req">*</span></label>
            <input className="form-input" value={form.first} onChange={(e) => set("first", e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Last name</label>
            <input className="form-input" value={form.last} onChange={(e) => set("last", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Mobile<span className="req">*</span></label>
            <input className="form-input" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Type</label>
            <select className="form-select" value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option>Individual</option><option>Proprietor</option><option>Company</option>
            </select></div>
        </div>
        <h3 style={{ marginTop: 16 }}>Address</h3>
        <div className="form-row">
          <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Address</label>
            <textarea className="form-textarea" value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Pincode</label>
            <input className="form-input" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></div>
        </div>
        <h3 style={{ marginTop: 16 }}>KYC</h3>
        <div className="form-row">
          <div className="form-group"><label className="form-label">PAN</label>
            <input className="form-input" value={form.pan} onChange={(e) => set("pan", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Aadhaar</label>
            <input className="form-input" value={form.aadhaar} onChange={(e) => set("aadhaar", e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button type="submit" className="btn btn-primary btn-sm">Create customer</button>
          <Link to="/customers" className="btn btn-ghost btn-sm">Cancel</Link>
        </div>
      </form>
    </>
  );
}
