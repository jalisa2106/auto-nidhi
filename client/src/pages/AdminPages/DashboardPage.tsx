import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/app/PageHeader'
import StatCard from '../../components/app/StatCard'
import { mockFiles, mockNotifications, fileStatuses } from '../../lib/mockData'
import { ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.email || 'Admin')
      }
    } catch { /* ignore */ }
  }, [])

  const role = localStorage.getItem('user_role') || 'admin'
  const isStaffLike = role === 'staff' || role === 'accountant' || role === 'data_entry'

  const myFiles = isStaffLike
    ? mockFiles.filter((f) => f.assigned.startsWith('Staff'))
    : mockFiles

  const byStatus = fileStatuses.map((s) => ({
    s,
    n: myFiles.filter((f) => f.status === s).length,
  }))

  return (
    <>
      <PageHeader
        title={`Welcome back, ${userName} 👋`}
        subtitle={role === 'admin' ? 'Full overview of your consultancy.' : 'Your assigned files & tasks.'}
      />

      <div className="stats-grid">
        <StatCard
          label="Active Files"
          value={myFiles.filter((f) => f.status !== 'Completed' && f.status !== 'Cancelled').length}
          delta="+2 this week"
          up
        />
        <StatCard label="Disbursed (MTD)" value="₹84.5L" delta="+12%" up />
        <StatCard label="Commission Receivable" value="₹6.2L" delta="3 pending" />
        <StatCard label="Insurance Expiring (30d)" value={18} delta="Action needed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Pipeline by Status */}
        <div className="section-card">
          <h3>Pipeline by status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12 }}>
            {byStatus.map((b) => (
              <div key={b.s} style={{ padding: 14, background: 'var(--surface-1)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-700)' }}>{b.n}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', fontWeight: 600 }}>{b.s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Link to="/files" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all files <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="section-card">
          <h3>Recent notifications</h3>
          {mockNotifications.map((n) => (
            <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: '.88rem', color: 'var(--gray-800)', fontWeight: n.read ? 400 : 600 }}>
                {n.message}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{n.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
