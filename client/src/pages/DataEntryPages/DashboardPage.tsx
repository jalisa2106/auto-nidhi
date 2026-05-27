import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import PageHeader from "../../components/app/PageHeader"
import StatCard from "../../components/app/StatCard"
import { ArrowRight } from "lucide-react"

// Hardcoded mocks to replicate the layout without breaking until API is hooked up
const mockFiles = [
  { id: "FILE/2026/001", status: "Completed" },
  { id: "FILE/2026/002", status: "Pending" },
  { id: "FILE/2026/003", status: "Under Process" }
]
const fileStatuses = ["Pending", "Under Process", "Approved", "Disbursed", "Completed"]
const mockNotifications = [
  { id: 1, message: "New document uploaded for FILE/2026/002", time: "1 hr ago", read: false },
  { id: 2, message: "FILE/2026/001 marked as completed", time: "1 day ago", read: true }
]

export default function DashboardPage() {
  const [userName, setUserName] = useState('Data Entry')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.name || 'Data Entry')
      }
    } catch { /* ignore */ }
  }, [])

  const byStatus = fileStatuses.map((s) => ({ s, n: mockFiles.filter((f) => f.status === s).length }))

  return (
    <>
      <PageHeader
        title={`Welcome back, ${userName}`}
        subtitle="Your assigned files & tasks."
      />

      <div className="stats-grid">
        <StatCard label="Active Files" value={mockFiles.length} delta="+2 this week" up />
        <StatCard label="Disbursed (MTD)" value="₹84.5L" delta="+12%" up />
        <StatCard label="Commission Receivable" value="₹6.2L" delta="3 pending" />
        <StatCard label="Insurance Expiring (30d)" value={18} delta="Action needed" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="section-card">
          <h3>Pipeline by status</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
            {byStatus.map((b) => (
              <div key={b.s} style={{ padding: 14, background: "var(--surface-1)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--brand-700)" }}>{b.n}</div>
                <div style={{ fontSize: ".78rem", color: "var(--gray-500)", fontWeight: 600 }}>{b.s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Link to="/data-entry/files" className="auth-link">View all files <ArrowRight size={14} /></Link>
          </div>
        </div>

        <div className="section-card">
          <h3>Recent notifications</h3>
          {mockNotifications.map((n) => (
            <div key={n.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <div style={{ fontSize: ".88rem", color: "var(--gray-800)", fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
              <div style={{ fontSize: ".75rem", color: "var(--gray-400)", marginTop: 2 }}>{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
