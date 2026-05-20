import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Users, CreditCard,
  Shield, TrendingUp, Bell, LogOut, Car,
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react'
import '../pages.css'

/* ── Sidebar nav items ── */
const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
  { icon: FileText,         label: 'Files',     path: '/files' },
  { icon: Users,            label: 'Customers', path: '/customers' },
  { icon: CreditCard,       label: 'Payments',  path: '/payments' },
  { icon: Shield,           label: 'Insurance', path: '/insurance' },
  { icon: TrendingUp,       label: 'Reports',   path: '/reports' },
]

/* ── Stat Card ── */
function StatCard({ title, value, change, up, icon: Icon, color }: any) {
  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', fontWeight: 500, marginBottom: 6 }}>{title}</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={20} color="#fff" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
        {up
          ? <ArrowUpRight size={14} color="#10b981" />
          : <ArrowDownRight size={14} color="#ef4444" />}
        <span style={{ color: up ? '#10b981' : '#ef4444', fontWeight: 600 }}>{change}</span>
        <span style={{ color: 'var(--gray-400)' }}>vs last month</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats] = useState({
    active_files: 248,
    total_customers: 1340,
    month_income: 4280000,
    expiring_policies_30d: 18,
  })

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-1)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: 'var(--surface-0)', borderRight: '1px solid var(--gray-100)',
        display: 'flex', flexDirection: 'column', padding: '0', position: 'fixed',
        top: 0, left: 0, bottom: 0, zIndex: 50, boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(37,99,235,.25)'
          }}>
            <Car size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
              Auto<span style={{ color: 'var(--gold-500)' }}>Nidhi</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', fontWeight: 500 }}>Consultancy Suite</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ icon: Icon, label, path, active }) => (
            <Link
              key={label}
              to={path}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: active ? 600 : 500,
                color: active ? 'var(--brand-700)' : 'var(--gray-600)',
                background: active ? 'var(--brand-50)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--gray-100)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-500)',
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={17} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 36px', minHeight: '100vh' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>
              Good evening 👋
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
              Here's what's happening with your consultancy today.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{
              width: 40, height: 40, borderRadius: 10, background: 'var(--surface-0)',
              border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', position: 'relative'
            }}>
              <Bell size={18} color="var(--gray-600)" />
              <span style={{
                position: 'absolute', top: 8, right: 8, width: 8, height: 8,
                background: 'var(--error)', borderRadius: '50%', border: '1.5px solid #fff'
              }} />
            </button>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
            }}>
              A
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          <StatCard title="Active Files"         value={stats.active_files}                   change="+12 files"  up={true}  icon={FileText}   color="var(--brand-600)" />
          <StatCard title="Total Customers"      value={stats.total_customers.toLocaleString()} change="+34"       up={true}  icon={Users}      color="#8b5cf6" />
          <StatCard title="Monthly Income"       value={`₹${(stats.month_income/100000).toFixed(1)}L`} change="+8.2%" up={true}  icon={TrendingUp} color="#10b981" />
          <StatCard title="Expiring (30 days)"   value={stats.expiring_policies_30d}           change="3 critical" up={false} icon={Shield}     color="#f59e0b" />
        </div>

        {/* Two-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

          {/* Recent Files */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>Recent Files</div>
              <Link to="/files" style={{ fontSize: '0.8rem', color: 'var(--brand-600)', fontWeight: 600 }}>
                View all →
              </Link>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  {['File No.', 'Customer', 'Type', 'Bank', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { no: 'AC/2025/0248', name: 'Rajesh Kumar',   type: 'New Loan',   bank: 'HDFC',   status: 'Sanctioned',    sc: '#dcfce7', tc: '#15803d' },
                  { no: 'AC/2025/0247', name: 'Priya Mehta',    type: 'Insurance',  bank: 'New India', status: 'Completed', sc: '#eff6ff', tc: 'var(--brand-700)' },
                  { no: 'AC/2025/0246', name: 'Suresh Patel',   type: 'Used Loan',  bank: 'SBI',    status: 'Under Process',  sc: '#fef3c7', tc: 'var(--gold-600)' },
                  { no: 'AC/2025/0245', name: 'Anita Shah',     type: 'New Loan',   bank: 'ICICI',  status: 'Login',          sc: '#fce7f3', tc: '#be185d' },
                  { no: 'AC/2025/0244', name: 'Mohan Verma',    type: 'New Loan',   bank: 'Axis',   status: 'Disbursed',      sc: '#dcfce7', tc: '#15803d' },
                ].map(r => (
                  <tr key={r.no} style={{ borderBottom: '1px solid var(--gray-50)' }}>
                    <td style={{ padding: '12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-600)' }}>{r.no}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--gray-700)' }}>{r.name}</td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.type}</td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.bank}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        background: r.sc, color: r.tc,
                        fontSize: '0.72rem', fontWeight: 600,
                        padding: '3px 10px', borderRadius: 99,
                      }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Expiring policies */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>⚠️ Expiring Policies</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: 'var(--gold-600)' }}>
                  18 total
                </span>
              </div>
              {[
                { name: 'Rajesh Kumar',  days: 3,  policy: 'New India — 3rd Party' },
                { name: 'Priya Mehta',   days: 7,  policy: 'ICICI Lombard — Comp.' },
                { name: 'Suresh Patel',  days: 14, policy: 'Bajaj Allianz — OD' },
              ].map(p => (
                <div key={p.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--gray-50)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{p.policy}</div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: p.days <= 7 ? '#dc2626' : 'var(--gold-600)',
                    background: p.days <= 7 ? '#fef2f2' : '#fef3c7',
                    padding: '3px 10px', borderRadius: 99
                  }}>{p.days}d</span>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: 16, fontSize: '0.95rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={16} color="var(--brand-600)" /> Recent Activity
                </span>
              </div>
              {[
                { msg: 'File AC/2025/0248 sanctioned', time: '2 min ago', color: 'var(--brand-600)' },
                { msg: '₹38,500 commission received',  time: '1 hr ago',  color: '#10b981' },
                { msg: 'Insurance for Suresh Patel verified', time: '3 hr ago', color: '#8b5cf6' },
                { msg: 'New customer added: Mohan V.', time: '5 hr ago',  color: '#f59e0b' },
              ].map((a, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--gray-50)' : 'none'
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: a.color,
                    flexShrink: 0, marginTop: 5
                  }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)', fontWeight: 500 }}>{a.msg}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
