import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'

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

  switch (role) {
    case 'admin':
      return <Navigate to="/dashboard" replace />
    case 'accountant':
      return <Navigate to="/accountant/dashboard" replace />
    case 'data_entry':
      return <Navigate to="/data-entry/dashboard" replace />
    case 'customer':
      return <Navigate to="/portal" replace />
    default:
      return <Navigate to="/login" replace />
  }
}