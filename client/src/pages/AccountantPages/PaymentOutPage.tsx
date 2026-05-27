import { useState } from "react"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockPaymentsOut = [
  { id: "PO001", file: "F1001", to: "Dealer A", amount: 8000, mode: "NEFT", category: "Disbursement", date: "2026-05-20" },
  { id: "PO002", file: "F1003", to: "Customer", amount: 2000, mode: "UPI", category: "Refund", date: "2026-05-21" },
]

export default function PaymentOutPage() {
  const [rows, setRows] = useState(mockPaymentsOut)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ file: "", to: "", amount: "", mode: "NEFT", category: "Disbursement", date: new Date().toISOString().slice(0, 10) })

  const save = () => {
    if (!form.amount) return
    setRows([{ id: `PO${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows])
    setForm({ file: "", to: "", amount: "", mode: "NEFT", category: "Disbursement", date: new Date().toISOString().slice(0, 10) })
    setOpen(false)
  }

  return (
    <>
      <PageHeader title="Payment OUT" subtitle="Disbursements, refunds & dealer payouts" />
      <DataTable
        rows={rows} searchKeys={["id", "file", "to"]} onAdd={() => setOpen(true)} addLabel="Record payout"
        columns={[
          { key: "id", label: "ID" },
          { key: "file", label: "File" },
          { key: "to", label: "Paid To" },
          { key: "category", label: "Category" },
          { key: "amount", label: "Amount", render: (r) => <span style={{ color: "#ef4444", fontWeight: 600 }}>-₹{r.amount.toLocaleString()}</span> },
          { key: "mode", label: "Mode" },
          { key: "date", label: "Date" },
        ]}
      />
      <Modal open={open} title="Record Payment OUT" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #</label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} placeholder="Optional" /></div>
          <div className="form-group"><label className="form-label">Paid To<span className="req">*</span></label>
            <input className="form-input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Disbursement</option><option>Refund</option><option>Dealer Payout</option>
            </select></div>
          <div className="form-group"><label className="form-label">Mode</label>
            <select className="form-select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option><option>Cash</option>
            </select></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  )
}
