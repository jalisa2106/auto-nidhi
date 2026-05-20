import React from 'react'
import { Form, Input, Button, Typography, Checkbox, message } from 'antd'
import { LoginOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'

import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text } = Typography

interface LoginFormValues {
  email: string
  password: string
  remember?: boolean
}

interface StoredUser {
  email: string
  password: string
  role: string
  name?: string
}

const Login: React.FC = () => {
  const navigate = useNavigate()

  // ✅ localStorage-based LOGIN (frontend-only dev mode)
  const handleLogin = (values: LoginFormValues) => {
    try {
      // Read users from localStorage
      const raw = localStorage.getItem('an_users')
      const users: StoredUser[] = raw ? JSON.parse(raw) : []

      const found = users.find(
        (u) => u.email === values.email && u.password === values.password
      )

      if (found) {
        // Store logged-in user info
        localStorage.setItem(
          'an_current_user',
          JSON.stringify({ email: found.email, role: found.role, name: found.name || '' })
        )
        // Store a fake access token so Dashboard's logout can clear it
        localStorage.setItem('access_token', 'local-dev-token')
        message.success('Login successful! Welcome back.')
        navigate('/dashboard')
      } else {
        message.error('Invalid email or password.')
      }
    } catch (err) {
      console.error(err)
      message.error('Something went wrong. Please try again.')
    }
  }

  return (
    <AuthLayout leftContent={<BrandSection />}>
      <AuthCard>

        <Title level={2} className="auth-title">
          Welcome Back
        </Title>

        <Text className="auth-subtitle">
          Login to continue to Auto-Nidhi
        </Text>

        {/* ✅ FORM */}
        <Form layout="vertical" onFinish={handleLogin}>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter password' },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>

            <Link to="#">
              Forgot password?
            </Link>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            icon={<LoginOutlined />}
            block
            className="auth-btn"
          >
            Login
          </Button>

        </Form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">
            Create account
          </Link>
        </div>

      </AuthCard>
    </AuthLayout>
  )
}

export default Login
