import React from 'react'
import '../../styles/auth.css'

interface AuthLayoutProps {
  leftContent: React.ReactNode
  children: React.ReactNode
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ leftContent, children }) => {
  return (
    <div className="auth-layout">

      <div className="brand-section">
        {leftContent}
      </div>

      <div className="auth-right">
        {children}
      </div>

    </div>
  )
}

export default AuthLayout
