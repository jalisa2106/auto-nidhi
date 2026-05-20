import React from 'react'
import { Card } from 'antd'

const AuthCard = ({ children }) => {
  return (
    <Card className="auth-card">
      {children}
    </Card>
  )
}

export default AuthCard