import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, ArrowRight, Activity,
  Clock, CheckCircle2, Car, Users, ChevronRight,
  ClipboardList, ShieldAlert, AlertTriangle,
} from 'lucide-react'
import api from '../../api/axios'
import FileDetailDrawer from '../../components/app/FileDetailDrawer'

// ── Types (matching DB fields from SystemUser + FileRecord) ──────────────────

type DEStats = {
  active_files?: number
  new_files?: number
  used_files?: number
  renewal_files?: number
  total_customers?: number
  completed_files?: number
  cancelled_files?: number
}

type DEPipelineItem = {
  status: string
  label?: string
  count: number
}

type DERecentFile = {
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

type DEActivity = {
  id: string
  user: string
  action: string
  record_id?: string
  created_at?: string
}

type InsuranceExpiringItem = {
  file_id?: string
  file?: string
  customer?: string
  policy?: string
  insurance_type?: string
  expires_on?: string
  days_label?: string
}

type DEDashboardData = {
  stats: DEStats
  pipeline: DEPipelineItem[]
  recent_files: DERecentFile[]
  activity: DEActivity[]
  insurance_expiring?: InsuranceExpiringItem[]
  user?: { name?: string; first_name?: string; email?: string }
}

const emptyDashboard: DEDashboardData = {
  stats: {},
  pipeline: [],
  recent_files: [],
  activity: [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  Draft:          { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  Login:          { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Under Process':{ bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  Sanctioned:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  Disbursed:      { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  Completed:      { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  Cancelled:      { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

const TYPE_LABEL: Record<string, string> = {
  new_vehicle: 'New Vehicle', used_vehicle: 'Used Vehicle', renewal: 'Renewal',
  NEW: 'New Vehicle', USED: 'Used Vehicle', RENEWAL: 'Renewal',
}

function normalizeStatus(status?: string) {
  if (!status) return 'Draft'
  return status.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataEntryDashboardPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Staff')
  const [dashboard, setDashboard] = useState<DEDashboardData>(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null)
  const [serviceRequestSummary, setServiceRequestSummary] = useState({ total: 0, pending: 0, unseen: 0, overdue: 0 })
  const [pendingModifications, setPendingModifications] = useState(0)
  const [summaryError, setSummaryError] = useState('')

  // Read user from localStorage (DB fields: first_name, last_name, email)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.first_name || u.name || u.email?.split('@')[0] || 'Staff')
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch dashboard stats — same endpoint as admin, scoped by role on backend
  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get<DEDashboardData>('/dashboard/stats')
        if (ignore) return
        setDashboard({
          ...emptyDashboard,
          ...data,
          stats:        data.stats        || {},
          pipeline:     data.pipeline     || [],
          recent_files: data.recent_files || [],
          activity:     data.activity     || [],
        })
        if (data.user?.first_name) setUserName(data.user.first_name)
      } catch (err: any) {
        if (!ignore) setError(err?.response?.data?.detail || err?.message || 'Unable to load dashboard')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadSummary() {
      try {
        setSummaryError('')

        const [serviceRes, modificationsRes] = await Promise.all([
          api.get('/service-requests/'),
          api.get('/customer/modifications'),
        ])

        const serviceList = Array.isArray(serviceRes.data) ? serviceRes.data : []
        const pendingMods = Array.isArray(modificationsRes.data) ? modificationsRes.data.filter((r: any) => r.status === 'pending').length : 0

        const overdueCount = serviceList.filter((r: any) => {
          const created = new Date(r.created_at).getTime()
          const threshold = Date.now() - (3 * 24 * 60 * 60 * 1000)
          return r.status === 'pending' && !r.viewed_by_consultant && created < threshold
        }).length

        if (!ignore) {
          setServiceRequestSummary({
            total: serviceList.length,
            pending: serviceList.filter((r: any) => r.status === 'pending').length,
            unseen: serviceList.filter((r: any) => !r.viewed_by_consultant).length,
            overdue: overdueCount,
          })
          setPendingModifications(pendingMods)
        }
      } catch (err: any) {
        if (!ignore) {
          setSummaryError('Unable to load request summary. Some dashboard counts may be unavailable.')
        }
      }
    }

    loadSummary()
    return () => { ignore = true }
  }, [])

  const stats = dashboard.stats
  const pipelineStatuses = ['Draft', 'Login', 'Under Process', 'Sanctioned', 'Disbursed']
  const pipelineCounts = pipelineStatuses.map(status => ({
    status,
    count: dashboard.pipeline.find(p => (p.label || normalizeStatus(p.status)) === status)?.count || 0,
    ...STATUS_COLOR[status],
  }))

  const recentFiles  = dashboard.recent_files.slice(0, 5)
  const recentActivity = dashboard.activity.slice(0, 4)
  const insuranceExpiringCount = dashboard.insurance_expiring?.length ?? 0
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="db-root">
      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
      {summaryError && <div className="form-error" style={{ marginBottom: 14 }}>{summaryError}</div>}
      {serviceRequestSummary.overdue > 0 && (
        <div style={{
          background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316',
          borderRadius: 12, padding: '16px 18px', color: '#c2410c', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} />
          <div style={{ fontSize: '.94rem', fontWeight: 700 }}>
            You have {serviceRequestSummary.overdue} pending service request{serviceRequestSummary.overdue === 1 ? '' : 's'} that have not been viewed for over 3 days. Please review them in Service Requests.
          </div>
        </div>
      )}

      {loading ? (
        <div className="data-empty" style={{ marginBottom: 14 }}>Loading dashboard...</div>
      ) : (
        <>
          {/* ── Welcome Banner ── */}
          <div className="db-welcome">
            <div>
              <div className="db-greeting">{greeting}, {userName}! 👋</div>
              <div className="db-sub">Your assigned files and tasks — AutoNidhi</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/staff/files" className="btn btn-primary btn-sm">Manage Files</Link>
              <Link to="/staff/customers" className="btn btn-outline btn-sm">Manage Customers</Link>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="db-kpi-grid">
            <div className="db-kpi-card db-kpi-blue" onClick={() => navigate('/staff/files')}>
              <div className="db-kpi-icon"><FolderOpen size={22} /></div>
              <div className="db-kpi-body">
                <div className="db-kpi-label">Active Files</div>
                <div className="db-kpi-value">{stats.active_files ?? 0}</div>
                <div className="db-kpi-sub">
                  <span className="db-chip db-chip-blue">{stats.new_files ?? 0} New</span>
                  <span className="db-chip db-chip-gold">{stats.used_files ?? 0} Used</span>
                  <span className="db-chip db-chip-purple">{stats.renewal_files ?? 0} Renewal</span>
                </div>
              </div>
              <ChevronRight size={16} className="db-kpi-arrow" />
            </div>

            <div className="db-kpi-card db-kpi-green" onClick={() => navigate('/staff/files')}>
              <div className="db-kpi-icon"><CheckCircle2 size={22} /></div>
              <div className="db-kpi-body">
                <div className="db-kpi-label">Completed Files</div>
                <div className="db-kpi-value">{stats.completed_files ?? 0}</div>
                <div className="db-kpi-sub">
                  <span className="db-kpi-tag green">All done</span>
                </div>
              </div>
              <ChevronRight size={16} className="db-kpi-arrow" />
            </div>

            <div className="db-kpi-card db-kpi-gold" onClick={() => navigate('/staff/customers')}>
              <div className="db-kpi-icon"><Users size={22} /></div>
              <div className="db-kpi-body">
                <div className="db-kpi-label">Total Customers</div>
                <div className="db-kpi-value">{stats.total_customers ?? 0}</div>
                <div className="db-kpi-sub">
                  <span className="db-kpi-tag gold">Registered</span>
                </div>
              </div>
              <ChevronRight size={16} className="db-kpi-arrow" />
            </div>

            <div className="db-kpi-card db-kpi-red" onClick={() => navigate('/staff/files')}>
              <div className="db-kpi-icon"><Car size={22} /></div>
              <div className="db-kpi-body">
                <div className="db-kpi-label">Cancelled Files</div>
                <div className="db-kpi-value">{stats.cancelled_files ?? 0}</div>
                <div className="db-kpi-sub">
                  <span className="db-kpi-tag red">Needs review</span>
                </div>
              </div>
              <ChevronRight size={16} className="db-kpi-arrow" />
            </div>
          </div>

          {/* ── Row 2: Pipeline ── */}
          <div className="db-row2">
            <div className="db-card db-pipeline">
              <div className="db-card-header">
                <div className="db-card-title"><Activity size={16} /> File Pipeline</div>
                <Link to="/staff/files" className="db-see-all">View all <ArrowRight size={12} /></Link>
              </div>
              <div className="db-pipeline-grid">
                {pipelineCounts.map(p => (
                  <div
                    key={p.status}
                    className="db-pipeline-item"
                    style={{ background: p.bg, cursor: 'pointer' }}
                    onClick={() => navigate('/staff/files')}
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
                {pipelineCounts.map(p => p.count > 0 && (
                  <div
                    key={p.status}
                    title={`${p.status}: ${p.count}`}
                    style={{ flex: p.count, height: 6, background: p.dot, borderRadius: 4, transition: 'flex .4s ease' }}
                  />
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title"><Clock size={16} /> Quick Actions</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'All Files',        to: '/staff/files',     icon: FolderOpen },
                  { label: 'All Customers',    to: '/staff/customers', icon: Users      },
                  { label: 'Service Requests', to: '/staff/requests',  icon: ClipboardList, badge: serviceRequestSummary.unseen > 0 ? serviceRequestSummary.unseen : 0 },
                  { label: 'Modifications',    to: '/staff/modifications', icon: ShieldAlert, badge: pendingModifications > 0 ? pendingModifications : 0 },
                  { label: 'Payment IN',       to: '/staff/payments/in',  icon: ArrowRight },
                  { label: 'Payment OUT',      to: '/staff/payments/out', icon: ArrowRight },
                  { label: 'Insurance',        to: '/staff/insurance-payments', icon: ShieldAlert },
                  { label: 'Expenses',         to: '/staff/expenses',  icon: ArrowRight },
                ].map(({ label, to, icon: Icon, badge }) => (
                  <Link key={to} to={to} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10,
                    background: '#f8fafc', border: '1px solid #f1f5f9',
                    textDecoration: 'none', color: '#334155', fontSize: '.84rem', fontWeight: 500,
                    transition: 'background .12s',
                  }}>
                    <Icon size={14} color="#2563eb" />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {label}
                      {badge ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 22, height: 22, padding: '0 8px', borderRadius: 999,
                          background: '#f8d7da', color: '#991b1b', fontSize: '.72rem', fontWeight: 700,
                        }}>{badge}</span>
                      ) : null}
                    </span>
                    <ArrowRight size={13} color="#94a3b8" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Insurance Expiring Summary ── */}
          <div className="db-row2" style={{ marginTop: 18 }}>
            <div className="db-card db-card-yellow" style={{ minWidth: 280 }}>
              <div className="db-card-header">
                <div className="db-card-title"><ShieldAlert size={16} /> Insurance Expiring Soon</div>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>{insuranceExpiringCount}</div>
                <div style={{ color: '#475569', fontSize: '.92rem' }}>
                  Policies expiring in the next 30 days for your assigned files.
                </div>
                <Link to="/staff/insurance-payments" className="db-see-all" style={{ marginTop: 8 }}>Review insurance <ArrowRight size={12} /></Link>
              </div>
            </div>
          </div>

          {/* ── Row 3: Recent Files + Activity ── */}
          <div className="db-row3">
            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title"><FolderOpen size={16} /> Recent Files</div>
                <Link to="/staff/files" className="db-see-all">All files <ArrowRight size={12} /></Link>
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
                    const status = f.status_label || normalizeStatus(f.status)
                    const sc = STATUS_COLOR[status] || STATUS_COLOR.Draft
                    return (
                      <tr key={f.id} onClick={() => setDrawerFileId(f.id)} style={{ cursor: 'pointer' }}>
                        <td><span className="db-file-id">{f.display_id || f.file_number || f.id.slice(0, 8)}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{f.customer || '—'}</td>
                        <td>
                          <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--gray-500)' }}>
                            {f.type_label || TYPE_LABEL[f.type || ''] || normalizeStatus(f.type) || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: sc.bg, color: sc.text, padding: '3px 9px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                            {status}
                          </span>
                        </td>
                        <td style={{ fontSize: '.8rem', color: 'var(--gray-500)' }}>{f.assigned || '—'}</td>
                      </tr>
                    )
                  })}
                  {recentFiles.length === 0 && (
                    <tr><td colSpan={5} style={{ color: 'var(--gray-400)' }}>No recent files</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <div className="db-card-title"><Clock size={16} /> Recent Activity</div>
              </div>
              <div className="db-activity-list">
                {recentActivity.map(a => (
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
          </div>
        </>
      )}
      <FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />
    </div>
  )
}
