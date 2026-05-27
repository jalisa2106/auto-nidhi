import { useState } from "react"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockRTO = [
  { id: "RTO001", file: "F1001", service: "Transfer of Ownership", amount: 1500, status: "Paid", date: "2026-05-20" },
]

export default function RTOPaymentsPage() {
  const [rows, setRows] = useState(mockRTO)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ file: "", service: "Transfer of Ownership", amount: "", status: "Paid", date: new Date().toISOString().slice(0, 10) })

  const save = () => {
    if (!form.amount || !form.file) return
    setRows([{ id: `RTO${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount) }, ...rows])
    setForm({ file: "", service: "Transfer of Ownership", amount: "", status: "Paid", date: new Date().toISOString().slice(0, 10) })
    setOpen(false)
  }

  return (
    <>
      <PageHeader title="RTO Payments" subtitle="Challans, taxes & agent fees" />
      <DataTable
        rows={rows} searchKeys={["id", "file", "service"]} onAdd={() => setOpen(true)} addLabel="Log RTO Payment"
        columns={[
          { key: "id", label: "ID" },
          { key: "file", label: "File" },
          { key: "service", label: "Service" },
          { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: "status", label: "Status" },
          { key: "date", label: "Date" },
        ]}
      />
      <Modal open={open} title="Log RTO Payment" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #<span className="req">*</span></label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Service</label>
            <input className="form-input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Paid</option><option>Pending</option>
            </select></div>
        </div>
      </Modal>
    </>
  )
}
