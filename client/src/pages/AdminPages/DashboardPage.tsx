import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, TrendingUp, TrendingDown,
  BadgePercent, ShieldAlert, ArrowRight, Activity,
  Bell, Clock, CheckCircle2,
  Car, Banknote, ChevronRight, Users,
} from 'lucide-react'
import api from '../../api/axios'

function fmt(n: number) {
  if (n >= 10_00_000) return `Rs ${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000) return `Rs ${(n / 1_000).toFixed(1)}K`
  return `Rs ${n}`
}

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  Draft: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  Login: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Under Process': { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  Sanctioned: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  Disbursed: { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  Completed: { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  Cancelled: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

const TYPE_LABEL: Record<string, string> = {
  NEW: 'New Vehicle',
  USED: 'Used Vehicle',
  RENEWAL: 'Renewal',
  new_vehicle: 'New Vehicle',
  used_vehicle: 'Used Vehicle',
  renewal: 'Renewal',
}

type DashboardStats = {
  active_files?: number
  new_files?: number
  used_files?: number
  renewal_files?: number
  total_customers?: number
  active_staff?: number
  completed_files?: number
  cancelled_files?: number
}

type DashboardFinancials = {
  payment_in?: number | string
  payment_in_transactions?: number
  payment_out?: number | string
  payment_out_transactions?: number
  commission_in?: number | string
  commission_in_transactions?: number
  net_position?: number | string
}

type DashboardPipelineItem = {
  status: string
  label?: string
  count: number
}

type DashboardRecentFile = {
  id: string
  file_number?: string
  display_id?: string
  customer: string
  type?: string
  type_label?: string
  status: string
  status_label?: string
  assigned?: string
}

type DashboardInsuranceItem = {
  file: string
  customer: string
  policy?: string
  insurance_type?: string
  expires_in: number
  days_label?: string
}

type DashboardNotification = {
  id: string
  message: string
  read: boolean
  created_at?: string
}

type DashboardActivity = {
  id: string
  user: string
  action: string
  record_id?: string
  created_at?: string
}

type DashboardData = {
  stats: DashboardStats
  financials: DashboardFinancials
  pipeline: DashboardPipelineItem[]
  recent_files: DashboardRecentFile[]
  insurance_expiring: DashboardInsuranceItem[]
  notifications: DashboardNotification[]
  unread_notifications: number
  activity: DashboardActivity[]
  admin?: { name?: string; email?: string }
}

const emptyDashboard: DashboardData = {
  stats: {},
  financials: {},
  pipeline: [],
  recent_files: [],
  insurance_expiring: [],
  notifications: [],
  unread_notifications: 0,
  activity: [],
}

function moneyValue(value: number | string | undefined) {
  return Number(value || 0)
}

function normalizeStatus(status?: string) {
  if (!status) return 'Draft'
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function timeLabel(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''

  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

  return d.toLocaleDateString()
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Admin')
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get<DashboardData>('/dashboard/stats')
        if (ignore) return

        setDashboard({
          ...emptyDashboard,
          ...data,
          stats: data.stats || {},
          financials: data.financials || {},
          pipeline: data.pipeline || [],
          recent_files: data.recent_files || [],
          insurance_expiring: data.insurance_expiring || [],
          notifications: data.notifications || [],
          unread_notifications: data.unread_notifications || 0,
          activity: data.activity || [],
        })

        if (data.admin?.name) setUserName(data.admin.name)
      } catch (err: any) {
        if (!ignore) setError(err?.response?.data?.detail || err?.message || 'Unable to load dashboard')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadDashboard()
    return () => { ignore = true }
  }, [])

  const stats = dashboard.stats
  const financials = dashboard.financials

  const activeFiles = stats.active_files || 0
  const newFiles = stats.new_files || 0
  const usedFiles = stats.used_files || 0
  const renewalFiles = stats.renewal_files || 0

  const totalPayIn = moneyValue(financials.payment_in)
  const totalPayOut = moneyValue(financials.payment_out)
  const totalCommIn = moneyValue(financials.commission_in)
  const netPosition = moneyValue(financials.net_position)
  const moneyInTotal = totalPayIn + totalCommIn

  const pipelineStatuses = ['Draft', 'Login', 'Under Process', 'Sanctioned', 'Disbursed']
  const pipelineCounts = pipelineStatuses.map((status) => ({
    status,
    count: dashboard.pipeline.find((p) => (p.label || normalizeStatus(p.status)) === status)?.count || 0,
    ...STATUS_COLOR[status],
  }))

  const recentFiles = dashboard.recent_files.slice(0, 5)
  const recentActivity = dashboard.activity.slice(0, 4)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="db-root">
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
      
      {loading ? (
        <div className="data-empty" style={{ marginBottom: 14 }}>Loading dashboard...</div>
      ) : (
        <>
          <div className="db-welcome">
            <div>
              <div className="db-greeting">{greeting}, {userName}</div>
              <div className="db-sub">
                {role === 'admin'
                  ? 'Full consultancy overview - AutoNidhi'
                  : 'Your assigned files and tasks - AutoNidhi'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/files" className="btn btn-primary btn-sm">Manage Files</Link>
              <Link to="/customers" className="btn btn-outline btn-sm">Manage Customers</Link>
            </div>
          </div>

          <div className="db-kpi-grid">
            <div className="db-kpi-card db-kpi-blue" onClick={() => navigate('/files')}>
              <div className="db-kpi-icon"><FolderOpen size={22} /></div>
              <div className="db-kpi-body">
                <div className="db-kpi-label">Active Files</div>
                <div className="db-kpi-value">{activeFiles}</div>
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
                  <span className="db-kpi-tag green">Up {financials.payment_in_transactions || 0} transactions</span>
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
                  <span className="db-kpi-tag red">Down {financials.payment_out_transactions || 0} transactions</span>
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
                  <span className="db-kpi-tag gold">From {financials.commission_in_transactions || 0} banks/insurers</span>
                </div>
              </div>
              <ChevronRight size={16} className="db-kpi-arrow" />
            </div>
          </div>

          <div className="db-row2">
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
              <div className="db-pipeline-bar">
                {pipelineCounts.map((p) => (
                  p.count > 0 && (
                    <div
                      key={p.status}
                      title={`${p.status}: ${p.count}`}
                      style={{ flex: p.count, height: 6, background: p.dot, borderRadius: 4, transition: 'flex .4s ease' }}
                    />
                  )
                ))}
              </div>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title"><ShieldAlert size={16} /> Insurance Expiring Soon</div>
                <Link to="/insurance-payments" className="db-see-all">Manage <ArrowRight size={12} /></Link>
              </div>
              {dashboard.insurance_expiring.length === 0 ? (
                <div className="db-empty"><CheckCircle2 size={28} color="#16a34a" /><span>All policies up to date</span></div>
              ) : (
                dashboard.insurance_expiring.map((ins) => (
                  <div key={ins.file} className="db-ins-item">
                    <div className="db-ins-icon"><Car size={15} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ins.customer}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{ins.insurance_type || ins.policy || 'Policy'} - #{ins.file}</div>
                    </div>
                    <div className={`db-ins-badge ${ins.expires_in <= 10 ? 'db-ins-red' : ins.expires_in <= 20 ? 'db-ins-amber' : 'db-ins-green'}`}>
                      {ins.days_label || `${ins.expires_in} days`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="db-row3">
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
                  {recentFiles.map((f) => {
                    const status = f.status_label || normalizeStatus(f.status)
                    const sc = STATUS_COLOR[status] || STATUS_COLOR.Draft
                    return (
                      <tr key={f.id} onClick={() => navigate(`/files/${f.id}`)} style={{ cursor: 'pointer' }}>
                        <td><span className="db-file-id">{f.display_id || f.file_number || f.id}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{f.customer}</td>
                        <td>
                          <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--gray-500)' }}>
                            {f.type_label || TYPE_LABEL[f.type || ''] || normalizeStatus(f.type)}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sc.bg, color: sc.text, padding: '3px 9px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                            {status}
                          </span>
                        </td>
                        <td style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{f.assigned || '-'}</td>
                      </tr>
                    )
                  })}
                  {recentFiles.length === 0 && (
                    <tr><td colSpan={5} style={{ color: 'var(--gray-400)' }}>No recent files</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="db-card">
                <div className="db-card-header">
                  <div className="db-card-title"><Clock size={16} /> Recent Activity</div>
                </div>
                <div className="db-activity-list">
                  {recentActivity.map((a) => (
                    <div key={a.id} className="db-activity-row">
                      <div className="db-activity-dot" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--gray-800)', fontSize: '.84rem' }}>{a.user}</span>
                        <span style={{ color: 'var(--gray-500)', fontSize: '.84rem' }}> {a.action}</span>
                        {a.record_id && <span className="db-file-id" style={{ marginLeft: 6 }}>{a.record_id.slice(0, 8)}</span>}
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{timeLabel(a.created_at)}</div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && <div className="db-empty"><span>No recent activity</span></div>}
                </div>
              </div>

              <div className="db-card">
                <div className="db-card-header">
                  <div className="db-card-title">
                    <Bell size={16} /> Notifications
                  </div>
                </div>
                <div>
                  <div className="db-empty"><span>No notifications</span></div>
                </div>
              </div>
            </div>
          </div>

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
                  <div className={`db-fin-val ${netPosition >= 0 ? 'green' : 'red'}`}>{fmt(netPosition)}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--gray-400)', marginBottom: 4 }}>
                  <span>Out</span><span>In</span>
                </div>
                <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${moneyInTotal + totalPayOut > 0 ? Math.min(100, (moneyInTotal / (moneyInTotal + totalPayOut)) * 100) : 0}%`,
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
                  <div className="db-fin-val blue">{stats.total_customers || 0}</div>
                </div>
                <div className="db-fin-item">
                  <div className="db-fin-label">Active Staff</div>
                  <div className="db-fin-val blue">{stats.active_staff || 0}</div>
                </div>
                <div className="db-fin-item">
                  <div className="db-fin-label">Completed Files</div>
                  <div className="db-fin-val green">{stats.completed_files || 0}</div>
                </div>
                <div className="db-fin-item">
                  <div className="db-fin-label">Cancelled Files</div>
                  <div className="db-fin-val red">{stats.cancelled_files || 0}</div>
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
        </>
      )}
    </div>
  )
}
