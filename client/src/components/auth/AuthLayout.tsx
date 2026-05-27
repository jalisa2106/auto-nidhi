import React from 'react'
import '../../styles/auth.css'

interface AuthLayoutProps {
  children: React.ReactNode
  brandContent: React.ReactNode
  /** When true: brand on LEFT, form on RIGHT (used by Sign Up page) */
  reverse?: boolean
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, brandContent, reverse = false }) => {
  return (
    <div className={`auth-layout${reverse ? ' auth-layout--reverse' : ''}`}>
      <div className="auth-form-panel">
        {children}
      </div>
      <div className="auth-brand-panel">
        {brandContent}
      </div>
    </div>
  )
}

export default AuthLayout
