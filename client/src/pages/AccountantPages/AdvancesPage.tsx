import { useState } from "react"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockAdvances = [
  { id: "ADV001", to: "Staff A", amount: 5000, date: "2026-05-01", status: "Pending", notes: "Monthly advance" },
  { id: "ADV002", to: "Dealer X", amount: 20000, date: "2026-05-15", status: "Cleared", notes: "For 5 files" },
]

export default function AdvancesPage() {
  const [rows, setRows] = useState(mockAdvances)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ to: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "Pending", notes: "" })

  const save = () => {
    if (!form.amount || !form.to) return
    setRows([{ id: `ADV${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows])
    setForm({ to: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "Pending", notes: "" })
    setOpen(false)
  }

  return (
    <>
      <PageHeader title="Advances" subtitle="Employee & dealer advance payments" />
      <DataTable
        rows={rows} searchKeys={["to", "notes"]} onAdd={() => setOpen(true)} addLabel="Give Advance"
        columns={[
          { key: "id", label: "ID" },
          { key: "date", label: "Date" },
          { key: "to", label: "Paid To" },
          { key: "notes", label: "Notes" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: "status", label: "Status", render: (r) => <span className={`badge ${r.status === "Cleared" ? "badge-green" : "badge-gold"}`}>{r.status}</span> },
        ]}
      />
      <Modal open={open} title="Give Advance" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Paid To<span className="req">*</span></label>
            <input className="form-input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Pending</option><option>Cleared</option>
            </select></div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}><label className="form-label">Notes</label>
            <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  )
}
