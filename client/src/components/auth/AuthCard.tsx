import React from 'react'
import { Card } from 'antd'

interface AuthCardProps {
  children: React.ReactNode
}

const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <Card className="auth-card">
      {children}
    </Card>
  )
}

export default AuthCard
