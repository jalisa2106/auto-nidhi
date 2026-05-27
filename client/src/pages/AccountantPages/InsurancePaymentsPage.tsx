import { useState } from "react"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockInsurance = [
  { id: "INS001", file: "F1002", company: "HDFC Ergo", premium: 12500, policy: "POL-12345", date: "2026-05-19" },
]

export default function InsurancePaymentsPage() {
  const [rows, setRows] = useState(mockInsurance)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ file: "", company: "HDFC Ergo", premium: "", policy: "", date: new Date().toISOString().slice(0, 10) })

  const save = () => {
    if (!form.premium || !form.file) return
    setRows([{ id: `INS${String(rows.length + 100).slice(-3)}`, ...form, premium: Number(form.premium) }, ...rows])
    setForm({ file: "", company: "HDFC Ergo", premium: "", policy: "", date: new Date().toISOString().slice(0, 10) })
    setOpen(false)
  }

  return (
    <>
      <PageHeader title="Insurance Payments" subtitle="Premium payouts to companies" />
      <DataTable
        rows={rows} searchKeys={["id", "file", "company", "policy"]} onAdd={() => setOpen(true)} addLabel="Log Premium"
        columns={[
          { key: "id", label: "ID" },
          { key: "file", label: "File" },
          { key: "company", label: "Company" },
          { key: "policy", label: "Policy #" },
          { key: "premium", label: "Premium", render: (r) => `₹${r.premium.toLocaleString()}` },
          { key: "date", label: "Date" },
        ]}
      />
      <Modal open={open} title="Log Premium Payment" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">File #<span className="req">*</span></label>
            <input className="form-input" value={form.file} onChange={(e) => setForm({ ...form, file: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Company</label>
            <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Policy #</label>
            <input className="form-input" value={form.policy} onChange={(e) => setForm({ ...form, policy: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Premium<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.premium} onChange={(e) => setForm({ ...form, premium: e.target.value })} required /></div>
        </div>
      </Modal>
    </>
  )
}
