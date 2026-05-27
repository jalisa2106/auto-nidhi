import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FileText, BellRing, UserCircle2,
  Car, LogOut,
} from 'lucide-react'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }

const customerNav: NavItem[] = [
  { to: '/portal',               label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/portal/files',         label: 'My Files',      icon: FileText },
  { to: '/portal/notifications', label: 'Notifications', icon: BellRing },
  { to: '/portal/profile',       label: 'Profile',       icon: UserCircle2 },
]

export default function CustomerLayout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Customer')

  useEffect(() => {
    const role = localStorage.getItem('user_role')
    let name = 'Customer'
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        name = u.first_name || u.name || 'Customer'
      }
    } catch { /* ignore */ }
    setUserName(name)
    
    if (!localStorage.getItem('access_token') || (role && role.toLowerCase() !== 'customer')) {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    navigate('/', { replace: true })
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
          <div className="sb-section">My Account</div>
          {customerNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <item.icon size={16} /> {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span>Customer</span>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <h1>Customer Portal</h1>
          <div className="app-user">
            <BellRing size={18} color="#64748b" />
            <div className="app-avatar">{userName.slice(0, 1).toUpperCase()}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
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
