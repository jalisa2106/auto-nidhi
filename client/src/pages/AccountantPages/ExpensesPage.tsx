import { useState } from "react"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockExpenses = [
  { id: "EXP001", category: "Office Supplies", amount: 1200, date: "2026-05-18", paidBy: "Petty Cash", notes: "Printer ink" },
  { id: "EXP002", category: "Travel", amount: 450, date: "2026-05-19", paidBy: "Staff A", notes: "RTO visit" },
]

export default function ExpensesPage() {
  const [rows, setRows] = useState(mockExpenses)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category: "Office Supplies", amount: "", date: new Date().toISOString().slice(0, 10), paidBy: "", notes: "" })

  const save = () => {
    if (!form.amount || !form.category) return
    setRows([{ id: `EXP${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows])
    setForm({ category: "Office Supplies", amount: "", date: new Date().toISOString().slice(0, 10), paidBy: "", notes: "" })
    setOpen(false)
  }

  return (
    <>
      <PageHeader title="Expenses" subtitle="Track company operating expenses" />
      <DataTable
        rows={rows} searchKeys={["category", "notes", "paidBy"]} onAdd={() => setOpen(true)} addLabel="Add Expense"
        columns={[
          { key: "id", label: "ID" },
          { key: "date", label: "Date" },
          { key: "category", label: "Category" },
          { key: "notes", label: "Description" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: "paidBy", label: "Paid By" },
        ]}
      />
      <Modal open={open} title="Add Expense" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Category<span className="req">*</span></label>
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Office Supplies</option><option>Travel</option><option>Rent</option><option>Utilities</option><option>Other</option>
            </select></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Paid By</label>
            <input className="form-input" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} /></div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}><label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  )
}
