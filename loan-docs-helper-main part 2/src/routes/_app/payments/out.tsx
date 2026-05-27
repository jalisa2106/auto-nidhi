import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockPaymentsOut } from "@/lib/mockData";

export const Route = createFileRoute("/_app/payments/out")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockPaymentsOut);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ file: "", payee: "", amount: "", mode: "NEFT", date: new Date().toISOString().slice(0, 10) });

  const save = () => {
    if (!form.payee || !form.amount) return;
    setRows([{ id: `PO${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows]);
    setForm({ file: "", payee: "", amount: "", mode: "NEFT", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Payment OUT" subtitle="Disbursements to dealers, agents & vendors" />
      <DataTable
        rows={rows} searchKeys={["id", "file", "payee"]} onAdd={() => setOpen(true)} addLabel="Record payment"
        columns={[
          { key: "id", label: "ID" },
          { key: "file", label: "File" },
          { key: "payee", label: "Payee" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: "mode", label: "Mode" },
          { key: "date", label: "Date" },
        ]}
      />
      <Modal open={open} title="Record Payment OUT" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #</label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} /></div>
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
        </div>
      </Modal>
    </>
  );
}
