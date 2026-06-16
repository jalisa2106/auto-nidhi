import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Users, FolderOpen, TrendingUp, TrendingDown, ClipboardList, BarChart2 } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'

/* ── Colour palette ─────────────────────────────────────────────────── */
const BRAND  = '#6366f1'
const GREEN  = '#22c55e'
const RED    = '#f43f5e'
const AMBER  = '#f59e0b'
const CYAN   = '#06b6d4'
const PURPLE = '#8b5cf6'

const PIE_COLORS = [BRAND, PURPLE]

const STATUS_COLORS: Record<string, string> = {
  draft:         '#94a3b8',
  login:         '#3b82f6',
  under_process: '#f59e0b',
  sanctioned:    '#8b5cf6',
  disbursed:     '#06b6d4',
  completed:     '#22c55e',
  cancelled:     '#ef4444',
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function fmtINR(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${n}`
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ── KPI Card ─────────────────────────────────────────────────────────── */
function KPI({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '18px 20px', borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: color + '18', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  )
}

/* ── Section wrapper ──────────────────────────────────────────────────── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize: '.92rem', fontWeight: 700, color: '#0f172a', marginBottom: 18 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

/* ── Custom tooltip ───────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,.1)',
      fontSize: '.8rem',
    }}>
      {label && <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {capitalize(p.dataKey)}: <strong>
            {p.dataKey.includes('payment') ? fmtINR(p.value) : p.value}
          </strong>
        </div>
      ))}
    </div>
  )
}

/* ── Main Component ───────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.get('/analytics/summary')
      .then(res => {
        setData(res.data)
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      })
      .catch((e: any) => setError(e?.response?.data?.detail || 'Failed to load analytics data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>
        Loading analytics…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ color: '#ef4444', marginBottom: 16 }}>{error || 'No analytics data returned'}</div>
        <button
          onClick={load}
          style={{
            padding: '8px 20px', borderRadius: 8, border: '1px solid #6366f1',
            background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const mod = data.modification_requests ?? {}
  const customerTypeSplit = data.customer_type_split ?? []
  const staffPerformance  = data.staff_performance   ?? []
  const filePipeline      = data.file_pipeline       ?? []
  const paymentTrends     = data.payment_trends      ?? []
  const newCustomers      = data.new_customers_by_month ?? []

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={`Business overview — last 6 months${lastUpdated ? ` · Updated at ${lastUpdated}` : ''}`}
      />

      {/* ── KPI Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <KPI icon={<Users size={20} />}        label="Total Customers"     value={data.total_customers ?? 0}  color={BRAND}  />
        <KPI icon={<FolderOpen size={20} />}   label="Total Files"         value={filePipeline.reduce((a: number, b: any) => a + b.count, 0)} color={CYAN}   />
        <KPI icon={<TrendingUp size={20} />}   label="Payment IN (6 mo)"   value={fmtINR(paymentTrends.reduce((a: number, b: any) => a + b.payment_in,  0))} color={GREEN}  />
        <KPI icon={<TrendingDown size={20} />} label="Payment OUT (6 mo)"  value={fmtINR(paymentTrends.reduce((a: number, b: any) => a + b.payment_out, 0))} color={RED}    />
        <KPI icon={<ClipboardList size={20} />}label="Pending Requests"    value={mod?.pending  ?? 0}     color={AMBER}  />
        <KPI icon={<BarChart2 size={20} />}    label="Resolved Requests"   value={mod?.approved ?? 0}    color={PURPLE} />
      </div>

      {/* ── Row 1: Customer Pie + Staff Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>

        {/* Customer Type Pie */}
        <ChartCard title="Customers by Type">
          {customerTypeSplit.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>No customer type data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={customerTypeSplit}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {customerTypeSplit.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Staff Performance Bar */}
        <ChartCard title="Staff Performance — Customers & Files">
          {staffPerformance.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>
              No staff data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={staffPerformance} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="customers" name="Customers" fill={BRAND} radius={[4, 4, 0, 0]} />
                <Bar dataKey="files"     name="Files"     fill={CYAN}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 2: File Pipeline ── */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="File Pipeline by Status">
          {filePipeline.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>No file pipeline data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={filePipeline}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="status"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={capitalize}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Files" radius={[0, 4, 4, 0]}>
                  {filePipeline.map((entry: any, index: number) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Payment Trends Line + Customer Registrations Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Payment trends */}
        <ChartCard title="Payment IN vs OUT — Last 6 Months">
          {paymentTrends.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>No payment trend data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={paymentTrends} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => fmtINR(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="payment_in" name="Payment IN" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4, fill: GREEN }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="payment_out" name="Payment OUT" stroke={RED} strokeWidth={2.5} dot={{ r: 4, fill: RED }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* New customer registrations */}
        <ChartCard title="New Customer Registrations — Last 6 Months">
          {newCustomers.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>No registration data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={newCustomers} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="New Customers" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Modification Request Summary ── */}
      <ChartCard title="Modification Requests Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total',    value: mod?.total ?? 0,    color: BRAND  },
            { label: 'Pending',  value: mod?.pending ?? 0,  color: AMBER  },
            { label: 'Approved', value: mod?.approved ?? 0, color: GREEN  },
            { label: 'Rejected', value: mod?.rejected ?? 0, color: RED    },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              textAlign: 'center', background: color + '0d',
              border: `1px solid ${color}30`, borderRadius: 10, padding: '14px 12px',
            }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color }}>{value}</div>
              <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
