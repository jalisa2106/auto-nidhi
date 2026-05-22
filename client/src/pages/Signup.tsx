import React, { useState } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
} from 'antd'
import { UserAddOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'

import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text } = Typography

interface SignupFormValues {
  first_name: string
  last_name?: string
  phone_number?: string
  email: string
  password: string
  confirmPassword: string
  role: string
  passkey?: string
}

const restrictedRoles = ['admin', 'accountant', 'data_entry']

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [showPasskey, setShowPasskey] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (values: SignupFormValues) => {
    try {
      setLoading(true)

      if (values.password !== values.confirmPassword) {
        message.error('Passwords do not match.')
        setLoading(false)
        return
      }

      if (!restrictedRoles.includes(values.role)) {
        values.passkey = undefined
      }

      const response = await fetch("http://localhost:8000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: values.first_name,
          last_name: values.last_name || null,
          phone_number: values.phone_number || null,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
          role: values.role,
          passkey: values.passkey || null,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        message.error(data.error || 'Signup failed.')
        setLoading(false)
        return
      }

      localStorage.setItem(
        'an_current_user',
        JSON.stringify({ 
          email: data.user, 
          role: data.role, 
          name: data.first_name || 'User' 
        })
      )
      localStorage.setItem('user_role', data.role)
      localStorage.setItem('access_token', data.access_token || 'local-dev-token')

      message.success('Account created successfully! Welcome.')
      
      if (data.role === 'customer') {
        navigate('/customer')
      } else {
        navigate('/dashboard')
      }
      
    } catch (err) {
      console.error("Backend connection error:", err)
      message.error('Failed to connect to the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout leftContent={<BrandSection />}>
      <AuthCard>
        <Title level={2} className="auth-title">
          Create Account
        </Title>

        <Text className="auth-subtitle">
          Start managing operations smarter
        </Text>

        <Form
          layout="vertical"
          onFinish={handleSignup}
        >
          <Form.Item
            label="First Name"
            name="first_name"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input placeholder="John" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="last_name"
          >
            <Input placeholder="Doe" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
              { pattern: /^[a-zA-Z0-9._%+-]+@gmail\.com$/, message: 'Only @gmail.com emails are allowed' }
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phone_number"
            rules={[
              { pattern: /^\+?[0-9\s\-]{10,15}$/, message: 'Please enter a valid phone number' }
            ]}
          >
            <Input placeholder="+91 9876543210" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select role' }]}
          >
            <Select
              placeholder="Select role"
              onChange={(value: string) =>
                setShowPasskey(restrictedRoles.includes(value))
              }
            >
              <Select.Option value="customer">Customer</Select.Option>
              <Select.Option value="admin">Admin 🔒</Select.Option>
              <Select.Option value="accountant">Accountant 🔒</Select.Option>
              <Select.Option value="data_entry">Data Entry 🔒</Select.Option>
            </Select>
          </Form.Item>

          {showPasskey && (
            <Form.Item
              label="Role Passkey"
              name="passkey"
              rules={[
                { required: true, message: 'Passkey required for this role' },
              ]}
            >
              <Input.Password placeholder="Enter role passkey" />
            </Form.Item>
          )}

          <Button
            type="primary"
            block
            icon={<UserAddOutlined />}
            htmlType="submit"
            className="auth-btn"
            loading={loading}
          >
            Create Account
          </Button>
        </Form>

        <div className="auth-footer">
          <Text>Already have an account? </Text>
          <Link to="/login">Sign in</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default Signup