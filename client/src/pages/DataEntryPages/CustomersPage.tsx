import { useState } from "react"
import { useNavigate } from "react-router-dom"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"
import Modal from "../../components/app/Modal"

const mockCustomers = [
  { id: 'C001', name: 'Raj Patel', mobile: '9876543210', city: 'Mumbai', files: 2, created: '2026-05-20' },
  { id: 'C002', name: 'Amit Shah', mobile: '8765432109', city: 'Ahmedabad', files: 1, created: '2026-05-21' }
]

export default function CustomersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(mockCustomers)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", mobile: "", city: "" })

  return (
    <>
      <PageHeader title="Customers" subtitle="All customers in the system" />
      <DataTable
        rows={rows}
        searchKeys={["name", "mobile", "city"]}
        onAdd={() => setOpen(true)}
        addLabel="New customer"
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name", render: (r) => <a className="auth-link" onClick={() => navigate(`/staff/customers/${r.id}`)}>{r.name}</a> },
          { key: "mobile", label: "Mobile" },
          { key: "city", label: "City" },
          { key: "files", label: "Active Files" },
          { key: "created", label: "Created" },
        ]}
      />
      <Modal open={open} title="Create customer" onClose={() => setOpen(false)} onSubmit={() => {
        if (!form.name) return
        setRows([{ id: `C${String(rows.length + 100).slice(-3)}`, ...form, files: 0, created: new Date().toISOString().slice(0, 10) }, ...rows])
        setForm({ name: "", mobile: "", city: "" })
        setOpen(false)
      }}>
        <div className="form-group"><label className="form-label">Full name<span className="req">*</span></label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Mobile</label>
            <input className="form-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  )
}
