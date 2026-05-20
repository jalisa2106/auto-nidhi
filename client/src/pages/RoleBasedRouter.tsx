import { useState, useEffect } from 'react'
import AdminDashboard from '../pages/Dashboard/AdminDashboard'

/* --- Blank components for your specific roles --- */
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

const CustomerDashboard = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface-1)' }}>
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--gray-900)' }}>Customer Portal</h2>
      <p style={{ color: 'var(--gray-500)' }}>Track my loan/RTO status...</p>
    </div>
  </div>
)
/* ---------------------------------------- */

export default function RoleBasedRouter() {
  const [role, setRole] = useState('admin') 

  useEffect(() => {
    // Read the user's role from local storage on login
    const savedRole = localStorage.getItem('user_role')
    if (savedRole) {
      setRole(savedRole)
    }
  }, [])

  // Route them to the correct dashboard based on their role
  switch (role) {
    case 'admin':
      return <AdminDashboard />
    case 'accountant':
      return <AccountantDashboard />
    case 'data_entry':
      return <DataEntryDashboard />
    case 'customer':
      return <CustomerDashboard />
    default:
      return (
        <div style={{ textAlign: 'center', marginTop: 50 }}>
          Invalid Role. Please log in again.
        </div>
      )
  }
}