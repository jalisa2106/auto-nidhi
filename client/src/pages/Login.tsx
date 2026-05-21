import React, { useState } from 'react'
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

const Login: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false) // Added loading state

  // ✅ Backend API-based LOGIN
  const handleLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true)

      // 1. Send the email and password to your FastAPI backend
      const response = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      })

      // 2. Read the response from Python
      const data = await response.json()

      // 3. Handle errors (e.g., wrong password or email doesn't exist)
      if (!response.ok || data.error) {
        message.error(data.error || 'Invalid email or password.')
        setLoading(false)
        return
      }

      // 4. Success! Save the user session locally so React knows they are logged in
      localStorage.setItem(
        'an_current_user',
        JSON.stringify({ 
          email: data.user, 
          role: data.role, 
          name: data.first_name || 'User' 
        })
      )
      
      // Store the exact role string (e.g. 'admin') for RoleBasedRouter
      localStorage.setItem('user_role', data.role)
      
      // Store the token (or a placeholder one until you fully implement JWTs)
      localStorage.setItem('access_token', data.access_token || 'local-dev-token')
      
      message.success('Login successful! Welcome back.')
      
      // 5. Redirect them to the main dashboard
      navigate('/dashboard')

    } catch (err) {
      console.error("Backend connection error:", err)
      message.error('Failed to connect to the server. Is FastAPI running?')
    } finally {
      setLoading(false)
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
              { pattern: /^[a-zA-Z0-9._%+-]+@gmail\.com$/, message: 'Only @gmail.com emails are allowed' }
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
            loading={loading} // Binds the spinner to the API call
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