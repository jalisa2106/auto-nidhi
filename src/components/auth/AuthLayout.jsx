import React from 'react'
import '../../styles/auth.css'

const AuthLayout = ({ leftContent, children }) => {
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