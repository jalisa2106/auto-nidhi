import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, TrendingUp, TrendingDown,
  BadgePercent, ShieldAlert, ArrowRight, Activity,
  Bell, Clock, CheckCircle2, AlertTriangle,
  Car, Banknote, ChevronRight, Users,
} from 'lucide-react'
import {
  mockFiles, mockPaymentsIn, mockPaymentsOut,
  mockCommissionsIn, mockInsuranceExpiring,
  mockNotifications, mockActivityFeed,
} from '../../lib/mockData'

// ── helpers ─────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n}`
}

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  'Draft':         { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  'Login':         { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Under Process': { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  'Sanctioned':    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'Disbursed':     { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  'Completed':     { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  'Cancelled':     { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

const TYPE_LABEL: Record<string, string> = {
  NEW: 'New Vehicle', USED: 'Used Vehicle', RENEWAL: 'Renewal',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Admin')
  const role = localStorage.getItem('user_role') || 'admin'

  useEffect(() => {
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.email?.split('@')[0] || 'Admin')
      }
    } catch { /* ignore */ }
  }, [])

  // ── KPI calculations (from mock data — swap with API later) ──────────
  const activeFiles  = mockFiles.filter(f => !['Completed','Cancelled'].includes(f.status))
  const newFiles     = activeFiles.filter(f => f.type === 'NEW').length
  const usedFiles    = activeFiles.filter(f => f.type === 'USED').length
  const renewalFiles = activeFiles.filter(f => f.type === 'RENEWAL').length

  const totalPayIn   = mockPaymentsIn.reduce((s, r) => s + r.amount, 0)
  const totalPayOut  = mockPaymentsOut.reduce((s, r) => s + r.amount, 0)
  const totalCommIn  = mockCommissionsIn.reduce((s, r) => s + r.amount, 0)

  // Pipeline (exclude Completed & Cancelled from pipeline view)
  const pipelineStatuses = ['Draft', 'Login', 'Under Process', 'Sanctioned', 'Disbursed']
  const pipelineCounts = pipelineStatuses.map(s => ({
    status: s,
    count: mockFiles.filter(f => f.status === s).length,
    ...STATUS_COLOR[s],
  }))

  // Recent files (last 5)
  const recentFiles = [...mockFiles]
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, 5)

  const unreadNotifs = mockNotifications.filter(n => !n.read)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="db-root">

      {/* ── Welcome Bar ──────────────────────────────────────────── */}
      <div className="db-welcome">
        <div>
          <div className="db-greeting">{greeting}, {userName} 👋</div>
          <div className="db-sub">
            {role === 'admin'
              ? 'Full consultancy overview · AutoNidhi'
              : 'Your assigned files and tasks · AutoNidhi'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/files/new" className="btn btn-primary btn-sm">+ New File</Link>
          <Link to="/customers/new" className="btn btn-outline btn-sm">+ New Customer</Link>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ─────────────────────────────────────── */}
      <div className="db-kpi-grid">

        <div className="db-kpi-card db-kpi-blue" onClick={() => navigate('/files')}>
          <div className="db-kpi-icon"><FolderOpen size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Active Files</div>
            <div className="db-kpi-value">{activeFiles.length}</div>
            <div className="db-kpi-sub">
              <span className="db-chip db-chip-blue">{newFiles} New</span>
              <span className="db-chip db-chip-gold">{usedFiles} Used</span>
              <span className="db-chip db-chip-purple">{renewalFiles} Renewal</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

        <div className="db-kpi-card db-kpi-green" onClick={() => navigate('/payments/in')}>
          <div className="db-kpi-icon"><TrendingUp size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Payment IN (MTD)</div>
            <div className="db-kpi-value">{fmt(totalPayIn)}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag green">↑ {mockPaymentsIn.length} transactions</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

        <div className="db-kpi-card db-kpi-red" onClick={() => navigate('/payments/out')}>
          <div className="db-kpi-icon"><TrendingDown size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Payment OUT (MTD)</div>
            <div className="db-kpi-value">{fmt(totalPayOut)}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag red">↓ {mockPaymentsOut.length} transactions</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

        <div className="db-kpi-card db-kpi-gold" onClick={() => navigate('/commissions/in')}>
          <div className="db-kpi-icon"><BadgePercent size={22} /></div>
          <div className="db-kpi-body">
            <div className="db-kpi-label">Commission Received</div>
            <div className="db-kpi-value">{fmt(totalCommIn)}</div>
            <div className="db-kpi-sub">
              <span className="db-kpi-tag gold">From {mockCommissionsIn.length} banks/insurers</span>
            </div>
          </div>
          <ChevronRight size={16} className="db-kpi-arrow" />
        </div>

      </div>

      {/* ── Row 2: Pipeline + Insurance Alerts ───────────────────── */}
      <div className="db-row2">

        {/* Pipeline */}
        <div className="db-card db-pipeline">
          <div className="db-card-header">
            <div className="db-card-title"><Activity size={16} /> File Pipeline</div>
            <Link to="/files" className="db-see-all">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="db-pipeline-grid">
            {pipelineCounts.map((p) => (
              <div
                key={p.status}
                className="db-pipeline-item"
                style={{ background: p.bg, cursor: 'pointer' }}
                onClick={() => navigate('/files')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: p.text, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: p.text, lineHeight: 1 }}>{p.count}</div>
                <div style={{ fontSize: '.72rem', color: p.text, opacity: 0.7, marginTop: 4 }}>
                  {p.count === 1 ? 'file' : 'files'}
                </div>
              </div>
            ))}
          </div>
          {/* Progress bar visualization */}
          <div className="db-pipeline-bar">
            {pipelineCounts.map(p => (
              p.count > 0 && (
                <div
                  key={p.status}
                  title={`${p.status}: ${p.count}`}
                  style={{
                    flex: p.count,
                    height: 6,
                    background: p.dot,
                    borderRadius: 4,
                    transition: 'flex .4s ease',
                  }}
                />
              )
            ))}
          </div>
        </div>

        {/* Insurance Expiring */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title"><ShieldAlert size={16} /> Insurance Expiring Soon</div>
            <Link to="/insurance-payments" className="db-see-all">Manage <ArrowRight size={12} /></Link>
          </div>
          {mockInsuranceExpiring.length === 0 ? (
            <div className="db-empty"><CheckCircle2 size={28} color="#16a34a" /><span>All policies up to date</span></div>
          ) : (
            mockInsuranceExpiring.map(ins => (
              <div key={ins.file} className="db-ins-item">
                <div className="db-ins-icon">
                  <Car size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ins.customer}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{ins.policy} · #{ins.file}</div>
                </div>
                <div className={`db-ins-badge ${ins.expiresIn <= 10 ? 'db-ins-red' : ins.expiresIn <= 20 ? 'db-ins-amber' : 'db-ins-green'}`}>
                  {ins.daysLabel}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ── Row 3: Recent Files + Activity + Notifications ───────── */}
      <div className="db-row3">

        {/* Recent Files */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-title"><FolderOpen size={16} /> Recent Files</div>
            <Link to="/files" className="db-see-all">All files <ArrowRight size={12} /></Link>
          </div>
          <table className="db-mini-table">
            <thead>
              <tr>
                <th>File #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {recentFiles.map(f => {
                const sc = STATUS_COLOR[f.status] || STATUS_COLOR['Draft']
                return (
                  <tr key={f.id} onClick={() => navigate(`/files/${f.id}`)} style={{ cursor: 'pointer' }}>
                    <td><span className="db-file-id">{f.id}</span></td>
                    <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{f.customer}</td>
                    <td>
                      <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--gray-500)' }}>
                        {TYPE_LABEL[f.type]}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sc.bg, color: sc.text, padding: '3px 9px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                        {f.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{f.assigned}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Activity + Notifications column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Activity Feed */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title"><Clock size={16} /> Recent Activity</div>
            </div>
            <div className="db-activity-list">
              {mockActivityFeed.map(a => (
                <div key={a.id} className="db-activity-row">
                  <div className="db-activity-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '.84rem' }}>{a.user}</span>
                    <span style={{ color: 'var(--gray-500)', fontSize: '.84rem' }}> {a.action}</span>
                    {a.file !== '—' && (
                      <span className="db-file-id" style={{ marginLeft: 6 }}>{a.file}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-title">
                <Bell size={16} /> Notifications
                {unreadNotifs.length > 0 && (
                  <span className="db-notif-badge">{unreadNotifs.length}</span>
                )}
              </div>
            </div>
            <div>
              {mockNotifications.map(n => (
                <div key={n.id} className={`db-notif-row ${!n.read ? 'db-notif-unread' : ''}`}>
                  <div className="db-notif-icon">
                    {!n.read
                      ? <AlertTriangle size={13} color="#f59e0b" />
                      : <CheckCircle2 size={13} color="#94a3b8" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.84rem', color: 'var(--gray-800)', fontWeight: n.read ? 400 : 600 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ── Row 4: Quick Financials Summary ──────────────────────── */}
      <div className="db-fin-row">
        <div className="db-card db-fin-card">
          <div className="db-card-title" style={{ marginBottom: 16 }}><Banknote size={16} /> Financial Snapshot (MTD)</div>
          <div className="db-fin-grid">
            <div className="db-fin-item">
              <div className="db-fin-label">Payment IN</div>
              <div className="db-fin-val green">{fmt(totalPayIn)}</div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Payment OUT</div>
              <div className="db-fin-val red">{fmt(totalPayOut)}</div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Commission IN</div>
              <div className="db-fin-val green">{fmt(totalCommIn)}</div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Net Position</div>
              <div className={`db-fin-val ${totalPayIn + totalCommIn - totalPayOut > 0 ? 'green' : 'red'}`}>
                {fmt(totalPayIn + totalCommIn - totalPayOut)}
              </div>
            </div>
          </div>
          {/* Simple visual bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--gray-400)', marginBottom: 4 }}>
              <span>Out</span><span>In</span>
            </div>
            <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((totalPayIn + totalCommIn) / (totalPayIn + totalCommIn + totalPayOut)) * 100)}%`,
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                borderRadius: 99,
                transition: 'width .6s ease',
              }} />
            </div>
          </div>
        </div>

        <div className="db-card db-fin-card">
          <div className="db-card-title" style={{ marginBottom: 16 }}><Users size={16} /> Customers & Team</div>
          <div className="db-fin-grid">
            <div className="db-fin-item">
              <div className="db-fin-label">Total Customers</div>
              <div className="db-fin-val blue">5</div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Active Staff</div>
              <div className="db-fin-val blue">2</div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Completed Files</div>
              <div className="db-fin-val green">
                {mockFiles.filter(f => f.status === 'Completed').length}
              </div>
            </div>
            <div className="db-fin-item">
              <div className="db-fin-label">Cancelled Files</div>
              <div className="db-fin-val red">
                {mockFiles.filter(f => f.status === 'Cancelled').length}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Link to="/customers" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              Customers
            </Link>
            <Link to="/settings/users" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              Manage Users
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}


