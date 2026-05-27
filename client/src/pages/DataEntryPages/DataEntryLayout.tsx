import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, FolderOpen,
  Car, LogOut, BellRing,
} from 'lucide-react'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }

const dataEntryNav: NavItem[] = [
  { to: '/data-entry/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/data-entry/customers', label: 'Customers', icon: Users },
  { to: '/data-entry/files',     label: 'Files',     icon: FolderOpen },
]

export default function DataEntryLayout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Data Entry')

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    let name = 'Data Entry'
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        name = u.first_name || u.name || 'Data Entry'
      }
    } catch { /* ignore */ }
    setUserName(name)

    if (!localStorage.getItem('access_token') || role.toLowerCase() !== 'data_entry') {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('an_current_user')
    localStorage.removeItem('user_role')
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark"><Car size={18} color="#fff" /></div>
          <div className="sb-brand">Auto<span>Nidhi</span></div>
        </div>

        <div>
          <div className="sb-section">Overview</div>
          {dataEntryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/data-entry/dashboard'}
              className={({ isActive }) => (isActive ? 'active-link' : '')}
            >
              <item.icon size={16} /> {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span>Data Entry</span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <h1>Data Entry Portal</h1>
          <div className="app-user">
            <BellRing size={18} color="#64748b" />
            <div className="app-avatar">{userName.slice(0, 1).toUpperCase()}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
