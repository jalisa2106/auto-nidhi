import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockCommissionsOut } from "@/lib/mockData";

export const Route = createFileRoute("/_app/commissions/out")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>(mockCommissionsOut);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ file: "", payee_type: "Dealer", payee: "", amount: "", mode: "NEFT", advance: false, date: new Date().toISOString().slice(0, 10) });
  const save = () => {
    if (!form.payee || !form.amount) return;
    setRows([{ id: `CO${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows]);
    setForm({ file: "", payee_type: "Dealer", payee: "", amount: "", mode: "NEFT", advance: false, date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="Commission OUT" subtitle="Payable to dealers, agents & brokers" />
      <DataTable rows={rows} searchKeys={["id", "file", "payee"]} onAdd={() => setOpen(true)} addLabel="Add commission"
        columns={[
          { key: "id", label: "ID" }, { key: "file", label: "File" }, { key: "payee_type", label: "Type" }, { key: "payee", label: "Payee" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` }, { key: "mode", label: "Mode" }, { key: "date", label: "Date" },
          { key: "advance", label: "Advance", render: (r) => r.advance ? <span className="badge badge-gold">Yes</span> : "No" },
        ]} />
      <Modal open={open} title="Add Commission OUT" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #</label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Payee type</label>
            <select className="form-select" value={form.payee_type} onChange={(e) => setForm({ ...form, payee_type: e.target.value })}>
              <option>Dealer</option><option>Broker</option><option>Agent</option>
            </select></div>
          <div className="form-group"><label className="form-label">Payee<span className="req">*</span></label>
            <input className="form-input" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Mode</label>
            <select className="form-select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option><option>Cash</option>
            </select></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="auth-checkbox"><input type="checkbox" checked={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.checked })} /> This is an advance</label>
          </div>
        </div>
      </Modal>
    </>
  );
}
