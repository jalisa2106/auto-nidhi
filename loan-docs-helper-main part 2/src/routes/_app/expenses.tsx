import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockExpenses, mockExpenseCategories } from "@/lib/mockData";

export const Route = createFileRoute("/_app/expenses")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockExpenses);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
  const save = () => {
    if (!form.category || !form.amount) return;
    setRows([{ id: `E${String(rows.length + 100).slice(-3)}`, category: form.category, amount: Number(form.amount), date: form.date } as any, ...rows]);
    setForm({ category: "", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="Expenses" subtitle="Office & operational expenses" />
      <DataTable rows={rows} searchKeys={["id", "category"]} onAdd={() => setOpen(true)} addLabel="Add expense"
        columns={[{ key: "id", label: "ID" }, { key: "category", label: "Category" },
        { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` }, { key: "date", label: "Date" }]} />
      <Modal open={open} title="Add Expense" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Category<span className="req">*</span></label>
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="">Select…</option>{mockExpenseCategories.map((c) => <option key={c.id}>{c.name}</option>)}
            </select></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
