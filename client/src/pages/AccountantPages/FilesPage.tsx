import { useState } from "react"
import { useNavigate } from "react-router-dom"
import PageHeader from "../../components/app/PageHeader"
import DataTable from "../../components/app/DataTable"

const mockFiles = [
  { id: "FILE/2026/001", customer: "Raj Patel", type: "NEW", status: "Completed", bank: "HDFC", assigned: "Staff A", created: "2026-05-20" },
  { id: "FILE/2026/002", customer: "Amit Shah", type: "USED", status: "Pending", bank: "ICICI", assigned: "Staff B", created: "2026-05-21" },
]
const fileStatuses = ["Pending", "Under Process", "Approved", "Disbursed", "Completed"]

export default function FilesPage() {
  const navigate = useNavigate()
  const [typeF, setTypeF] = useState("")
  const [statusF, setStatusF] = useState("")
  
  const filtered = mockFiles.filter((f) => (!typeF || f.type === typeF) && (!statusF || f.status === statusF))
  
  const statusBadge = (s: string) => {
    const c = s === "Completed" ? "badge-green" : s === "Cancelled" ? "badge-red" : s === "Disbursed" ? "badge-blue" : s === "Draft" ? "badge-gray" : "badge-gold"
    return <span className={`badge ${c}`}>{s}</span>
  }

  return (
    <>
      <PageHeader title="Files" subtitle="All loan & insurance files (Read Only for Accountant)" />
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <select className="form-select" style={{ maxWidth: 180 }} value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All types</option><option value="NEW">New</option><option value="USED">Used</option><option value="RENEWAL">Renewal</option>
        </select>
        <select className="form-select" style={{ maxWidth: 200 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">All statuses</option>{fileStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <DataTable rows={filtered} searchKeys={["id", "customer", "bank"]} columns={[
        { key: "id", label: "File #", render: (r) => <a className="auth-link" onClick={() => navigate(`/accountant/files/${r.id}`)}>{r.id}</a> },
        { key: "customer", label: "Customer" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status", render: (r) => statusBadge(r.status) },
        { key: "bank", label: "Bank" },
        { key: "assigned", label: "Assigned" },
        { key: "created", label: "Created" },
      ]} />
    </>
  )
}
