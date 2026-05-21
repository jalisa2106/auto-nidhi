import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import AdminDashboard from '../pages/Dashboard/AdminDashboard'

/* --- Blank components for your specific internal roles --- */
const AccountantDashboard = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface-1)' }}>
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--gray-900)' }}>Accountant Dashboard</h2>
      <p style={{ color: 'var(--gray-500)' }}>Focused on payments, invoices, and revenue...</p>
    </div>
  </div>
)

const DataEntryDashboard = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface-1)' }}>
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--gray-900)' }}>Data Entry Dashboard</h2>
      <p style={{ color: 'var(--gray-500)' }}>Focused on uploading documents and adding new applications...</p>
    </div>
  </div>
)
/* -------------------------------------------------------- */

export default function RoleBasedRouter() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedRole = localStorage.getItem('user_role')
    setRole(savedRole)
    setLoading(false)
  }, [])

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--gray-500)' }}>Verifying session...</div>
  }

  // Security gate intercepts customer roles or unauthenticated exploration attempts
  switch (role) {
    case 'admin':
      return <AdminDashboard />
    case 'accountant':
      return <AccountantDashboard />
    case 'data_entry':
      return <DataEntryDashboard />
    case 'customer':
      return <Navigate to="/customer" replace />
    default:
      return <Navigate to="/login" replace />
  }
}