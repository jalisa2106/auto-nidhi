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
  email: string
  password: string
  confirmPassword: string
  role: string
  passkey?: string
}

interface StoredUser {
  email: string
  password: string
  role: string
}

const restrictedRoles = ['admin', 'accountant', 'data_entry']

const Signup: React.FC = () => {
  const navigate = useNavigate()
  const [showPasskey, setShowPasskey] = useState(false)

  // ✅ localStorage-based SIGNUP (frontend-only dev mode)
  const handleSignup = (values: SignupFormValues) => {
    try {
      // Remove passkey if not required
      if (!restrictedRoles.includes(values.role)) {
        values.passkey = undefined
      }

      // Read existing users from localStorage
      const raw = localStorage.getItem('an_users')
      const users: StoredUser[] = raw ? JSON.parse(raw) : []

      // Check if user already exists
      const exists = users.some((u) => u.email === values.email)
      if (exists) {
        message.error('An account with this email already exists.')
        return
      }

      // Password match check
      if (values.password !== values.confirmPassword) {
        message.error('Passwords do not match.')
        return
      }

      // Save new user
      users.push({
        email: values.email,
        password: values.password,
        role: values.role,
      })
      localStorage.setItem('an_users', JSON.stringify(users))

      message.success('Account created successfully! Please login.')
      navigate('/login')
    } catch (err) {
      console.error(err)
      message.error('Something went wrong. Please try again.')
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
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="you@example.com" />
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

          {/* Passkey only for restricted roles */}
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
