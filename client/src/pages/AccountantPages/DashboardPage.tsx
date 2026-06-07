import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowRight, Clock } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import StatCard from '../../components/app/StatCard'
import api from '../../api/axios'

function fmtINR(n: number): string {
  if (n >= 10_00_000) return '₹' + (n / 10_00_000).toFixed(1) + 'L'
  if (n >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'K'
  return '₹' + Number(n).toLocaleString('en-IN')
}

const STATUS_COLORS: Record<string, string> = {
  draft:         '#94a3b8',
  login:         '#3b82f6',
  under_process: '#f59e0b',
  sanctioned:    '#8b5cf6',
  disbursed:     '#10b981',
  completed:     '#22c55e',
  cancelled:     '#ef4444',
}

export default function AccountantDashboardPage() {
  const [stats, setStats]                   = useState<any>(null)
  const [financials, setFinancials]         = useState<any>(null)
  const [pipeline, setPipeline]             = useState<any[]>([])
  const [insurance, setInsurance]           = useState<any[]>([])
  const [recentFiles, setRecentFiles]       = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [userName, setUserName]             = useState('Accountant')

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('an_current_user') || '{}')
      setUserName(u.first_name || u.name || 'Accountant')
    } catch { /* ignore */ }

    api.get('/api/v1/dashboard/stats')
      .then(res => {
        const d = res.data
        setStats(d.stats || {})
        setFinancials(d.financials || {})
        setPipeline(Array.isArray(d.pipeline) ? d.pipeline : [])
        setInsurance(Array.isArray(d.insurance_expiring) ? d.insurance_expiring : [])
        setRecentFiles(Array.isArray(d.recent_files) ? d.recent_files : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const netPos = financials?.net_position ?? 0
  const netPositive = netPos >= 0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--gray-400)' }}>
        Loading dashboard…
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={`Welcome back, ${userName}`}
        subtitle="Financial overview — real-time consultancy data."
      />

      {/* ── 4 KPI cards ── */}
      <div className="stats-grid">
        <StatCard
          label="Active Files"
          value={stats?.active_files ?? 0}
          delta={`${stats?.total_files ?? 0} total files`}
          up
        />
        <StatCard
          label="Payment IN (MTD)"
          value={fmtINR(Number(financials?.payment_in ?? 0))}
          delta={`${financials?.payment_in_transactions ?? 0} transactions`}
          up
        />
        <StatCard
          label="Payment OUT (MTD)"
          value={fmtINR(Number(financials?.payment_out ?? 0))}
          delta={`${financials?.payment_out_transactions ?? 0} transactions`}
        />
        <StatCard
          label="Net Position (MTD)"
          value={(netPositive ? '+' : '') + fmtINR(Math.abs(netPos))}
          delta={netPositive ? '▲ Surplus' : '▼ Deficit'}
          up={netPositive}
        />
      </div>

      {/* ── Pipeline + Insurance grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>

        {/* Pipeline by status */}
        <div className="section-card">
          <h3 style={{ marginBottom: 14 }}>Pipeline by Status</h3>
          {pipeline.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '.88rem', padding: '12px 0' }}>No active files in pipeline.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              {pipeline.map((p) => (
                <div key={p.status} style={{
                  padding: '14px 12px', background: 'var(--surface-1)',
                  borderRadius: 10, textAlign: 'center',
                  borderTop: `3px solid ${STATUS_COLORS[p.status] ?? '#94a3b8'}`,
                }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 800, color: STATUS_COLORS[p.status] ?? 'var(--brand-700)' }}>
                    {p.count}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: 2 }}>
                    {p.label || p.status}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <Link to="/accountant/files" className="auth-link">
              View all files <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Insurance expiring */}
        <div className="section-card">
          <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="#ef4444" /> Insurance Expiring
          </h3>
          {insurance.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '.88rem' }}>No policies expiring soon. ✅</div>
          ) : (
            insurance.slice(0, 5).map((item, i) => (
              <div key={i} style={{
                padding: '8px 0', borderBottom: i < insurance.length - 1 ? '1px solid var(--gray-100)' : 'none',
              }}>
                <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                  {item.file_number || item.file}
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  {item.customer} · {item.days_label}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Recent Files ── */}
      {recentFiles.length > 0 && (
        <div className="section-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--brand-600)" /> Recent Files
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>File #</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map((f) => (
                  <tr key={f.id}>
                    <td><span className="db-file-id">{f.file_number || f.display_id}</span></td>
                    <td style={{ fontWeight: 500 }}>{f.customer}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>{f.type_label || f.type}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
                        background: STATUS_COLORS[f.status] + '22',
                        color: STATUS_COLORS[f.status] ?? 'var(--gray-600)',
                      }}>
                        {f.status_label || f.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--gray-500)' }}>{f.assigned || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
