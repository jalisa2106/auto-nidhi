import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockPaymentsIn } from "@/lib/mockData";

export const Route = createFileRoute("/_app/payments/in")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockPaymentsIn);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ file: "", customer: "", amount: "", mode: "UPI", from: "Customer", date: new Date().toISOString().slice(0, 10) });

  const save = () => {
    if (!form.file || !form.amount) return;
    setRows([{ id: `PI${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows]);
    setForm({ file: "", customer: "", amount: "", mode: "UPI", from: "Customer", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Payment IN" subtitle="Customer & bank/insurer receipts" />
      <DataTable
        rows={rows} searchKeys={["id", "file", "customer"]} onAdd={() => setOpen(true)} addLabel="Record receipt"
        columns={[
          { key: "id", label: "ID" },
          { key: "file", label: "File" },
          { key: "customer", label: "Customer" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: "mode", label: "Mode" },
          { key: "from", label: "From" },
          { key: "date", label: "Date" },
        ]}
      />
      <Modal open={open} title="Record Payment IN" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #<span className="req">*</span></label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} placeholder="F1001" required /></div>
          <div className="form-group"><label className="form-label">Customer</label>
            <input className="form-input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Mode</label>
            <select className="form-select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option>UPI</option><option>NEFT</option><option>RTGS</option><option>Cheque</option><option>Cash</option>
            </select></div>
          <div className="form-group"><label className="form-label">From</label>
            <select className="form-select" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
              <option>Customer</option><option>Bank</option><option>Insurer</option>
            </select></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
