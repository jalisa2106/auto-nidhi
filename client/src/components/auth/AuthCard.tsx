import React from 'react'

const AuthCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="auth-card">
      {children}
    </div>
  )
}

export default AuthCard
