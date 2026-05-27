import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, FolderOpen, Wallet, ArrowDownToLine, ArrowUpFromLine,
  Receipt, Landmark, ShieldCheck, FileText, Settings, Database, LogOut,
  UserCircle2, BellRing, Car, BadgePercent, HandCoins, BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { clearSession, getCurrentUser, type CurrentUser, type Role } from "@/lib/auth";

interface NavItem { to: string; label: string; icon: React.ComponentType<any>; }
interface NavGroup { title: string; items: NavItem[]; }

const adminNav: NavGroup[] = [
  { title: "Overview", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/files", label: "Files", icon: FolderOpen },
  ]},
  { title: "Finance", items: [
    { to: "/payments/in", label: "Payment IN", icon: ArrowDownToLine },
    { to: "/payments/out", label: "Payment OUT", icon: ArrowUpFromLine },
    { to: "/commissions/in", label: "Commission IN", icon: BadgePercent },
    { to: "/commissions/out", label: "Commission OUT", icon: HandCoins },
    { to: "/rto-payments", label: "RTO Payments", icon: Receipt },
    { to: "/insurance-payments", label: "Insurance Payments", icon: ShieldCheck },
    { to: "/expenses", label: "Expenses", icon: Wallet },
    { to: "/advances", label: "Advances", icon: Landmark },
  ]},
  { title: "Masters", items: [
    { to: "/masters/dealers", label: "Dealers", icon: Database },
    { to: "/masters/brokers", label: "Brokers", icon: Database },
    { to: "/masters/finance-banks", label: "Finance Banks", icon: Database },
    { to: "/masters/insurance-companies", label: "Insurance Cos.", icon: Database },
    { to: "/masters/insurance-types", label: "Insurance Types", icon: Database },
    { to: "/masters/expense-categories", label: "Expense Categories", icon: Database },
  ]},
  { title: "Insights", items: [
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ]},
  { title: "Settings", items: [
    { to: "/settings/company", label: "Company", icon: Settings },
    { to: "/settings/banks", label: "Bank Accounts", icon: Settings },
    { to: "/settings/users", label: "Users", icon: Users },
  ]},
];

const staffNav: NavGroup[] = [
  { title: "Overview", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/customers", label: "Customers", icon: Users },
    { to: "/files", label: "Files", icon: FolderOpen },
  ]},
  { title: "Finance", items: [
    { to: "/payments/in", label: "Payment IN", icon: ArrowDownToLine },
    { to: "/payments/out", label: "Payment OUT", icon: ArrowUpFromLine },
    { to: "/rto-payments", label: "RTO Payments", icon: Receipt },
    { to: "/insurance-payments", label: "Insurance Payments", icon: ShieldCheck },
    { to: "/expenses", label: "Expenses", icon: Wallet },
    { to: "/advances", label: "Advances", icon: Landmark },
  ]},
];

const agentNav: NavGroup[] = [
  { title: "Agent", items: [
    { to: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/agent/customers", label: "My Customers", icon: Users },
    { to: "/agent/files", label: "My Files", icon: FolderOpen },
    { to: "/agent/commissions", label: "Commissions", icon: BadgePercent },
  ]},
];

const customerNav: NavGroup[] = [
  { title: "My Account", items: [
    { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { to: "/portal/files", label: "My Files", icon: FileText },
    { to: "/portal/notifications", label: "Notifications", icon: BellRing },
    { to: "/portal/profile", label: "Profile", icon: UserCircle2 },
  ]},
];

function navFor(role: Role | null): NavGroup[] {
  switch (role) {
    case "admin": return adminNav;
    case "staff": case "accountant": case "data_entry": return staffNav;
    case "agent": return agentNav;
    case "customer": return customerNav;
    default: return [];
  }
}

export default function AppShell() {
  const router = useRouter();
  const state = useRouterState();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.navigate({ to: "/login" });
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const groups = navFor(user.role);
  const handleLogout = () => { clearSession(); router.navigate({ to: "/login" }); };

  // Derive page title from the deepest matched route's pathname.
  const path = state.location.pathname;
  const title = pathTitle(path);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sb-logo">
          <div className="sb-logo-mark"><Car size={18} color="#fff" /></div>
          <div className="sb-brand">Auto<span>Nidhi</span></div>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <div className="sb-section">{g.title}</div>
            {g.items.map((it) => (
              <Link key={it.to} to={it.to} activeOptions={{ exact: it.to === "/dashboard" || it.to === "/portal" || it.to === "/agent/dashboard" }}>
                <it.icon size={16} /> {it.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="sb-foot">
          Signed in as <strong style={{ color: "#fff" }}>{user.name}</strong><br />
          <span style={{ textTransform: "capitalize" }}>{user.role}</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <h1>{title}</h1>
          <div className="app-user">
            <BellRing size={18} color="#64748b" />
            <div className="app-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
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
  );
}

function pathTitle(p: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/customers": "Customers",
    "/customers/new": "New Customer",
    "/files": "Files",
    "/files/new": "New File",
    "/payments/in": "Payment IN",
    "/payments/out": "Payment OUT",
    "/commissions/in": "Commission IN",
    "/commissions/out": "Commission OUT",
    "/rto-payments": "RTO Payments",
    "/insurance-payments": "Insurance Payments",
    "/expenses": "Expenses",
    "/advances": "Advances",
    "/settings/company": "Company Settings",
    "/settings/banks": "Bank Accounts",
    "/settings/users": "User Management",
    "/agent/dashboard": "Agent Dashboard",
    "/agent/customers": "My Customers",
    "/agent/files": "My Files",
    "/agent/commissions": "My Commissions",
    "/reports": "Reports",
    "/portal": "My Dashboard",
    "/portal/files": "My Files",
    "/portal/profile": "Profile",
    "/portal/notifications": "Notifications",
  };
  if (map[p]) return map[p];
  if (p.startsWith("/masters/")) return "Master Data";
  if (p.startsWith("/customers/")) return "Customer";
  if (p.startsWith("/files/")) return "File";
  if (p.startsWith("/portal/files/")) return "My File";
  return "AutoNidhi";
}
