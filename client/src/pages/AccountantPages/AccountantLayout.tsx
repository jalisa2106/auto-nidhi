import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FolderOpen, ArrowDownToLine, ArrowUpFromLine,
  Receipt, ShieldCheck, Wallet, Landmark, BadgePercent,
  Car, LogOut, BellRing,
} from 'lucide-react'

interface NavItem { to: string; label: string; icon: React.ComponentType<any> }
interface NavGroup { title: string; items: NavItem[] }

const accountantNav: NavGroup[] = [
  {
    title: 'Overview', items: [
      { to: '/accountant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/accountant/files',     label: 'Files',     icon: FolderOpen },
    ],
  },
  {
    title: 'Finance', items: [
      { to: '/accountant/payments/in',         label: 'Payment IN',         icon: ArrowDownToLine  },
      { to: '/accountant/payments/out',        label: 'Payment OUT',        icon: ArrowUpFromLine  },
      { to: '/accountant/rto-payments',        label: 'RTO Payments',       icon: Receipt          },
      { to: '/accountant/insurance-payments',  label: 'Insurance Payments', icon: ShieldCheck      },
      { to: '/accountant/expenses',            label: 'Expenses',           icon: Wallet           },
      { to: '/accountant/advances',            label: 'Advances',           icon: Landmark         },
      { to: '/accountant/commission/in',       label: 'Commission IN',      icon: BadgePercent     },
      { to: '/accountant/commission/out',      label: 'Commission OUT',     icon: BadgePercent     },
    ],
  },
]

export default function AccountantLayout() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('Accountant')

  useEffect(() => {
    const role = localStorage.getItem('user_role') || ''
    let name = 'Accountant'
    try {
      const stored = localStorage.getItem('an_current_user')
      if (stored) {
        const u = JSON.parse(stored)
        name = u.first_name || u.name || 'Accountant'
      }
    } catch { /* ignore */ }
    setUserName(name)

    if (!localStorage.getItem('access_token') || role.toLowerCase() !== 'accountant') {
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

        {accountantNav.map((group) => (
          <div key={group.title}>
            <div className="sb-section">{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/accountant/dashboard'}
                className={({ isActive }) => (isActive ? 'active-link' : '')}
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sb-foot">
          Signed in as <strong style={{ color: '#fff' }}>{userName}</strong><br />
          <span>Accountant</span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="app-main">
        <header className="app-topbar">
          <h1>Accountant Portal</h1>
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
