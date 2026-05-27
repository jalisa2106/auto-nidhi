import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockCommissionsIn } from "@/lib/mockData";

export const Route = createFileRoute("/_app/commissions/in")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockCommissionsIn);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ file: "", payment_by: "", amount: "", date: new Date().toISOString().slice(0, 10) });
  const save = () => {
    if (!form.file || !form.amount) return;
    setRows([{ id: `CI${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows]);
    setForm({ file: "", payment_by: "", amount: "", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="Commission IN" subtitle="Receivable from banks & insurers" />
      <DataTable rows={rows} searchKeys={["id", "file", "payment_by"]} onAdd={() => setOpen(true)} addLabel="Add commission"
        columns={[{ key: "id", label: "ID" }, { key: "file", label: "File" }, { key: "payment_by", label: "From" },
        { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` }, { key: "date", label: "Date" }]} />
      <Modal open={open} title="Add Commission IN" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #<span className="req">*</span></label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">From (Bank/Insurer)</label>
            <input className="form-input" value={form.payment_by} onChange={(e) => setForm({ ...form, payment_by: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
