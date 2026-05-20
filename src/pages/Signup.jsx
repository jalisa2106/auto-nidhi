import { Link } from "react-router-dom"
import React, { useState } from 'react'

import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
} from 'antd'

import {
  UserAddOutlined,
} from '@ant-design/icons'

import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text } = Typography

const Signup = () => {

  const [showPasskey, setShowPasskey] = useState(false)

  const restrictedRoles = [
    'admin',
    'accountant',
    'data_entry',
  ]

  // ✅ API CALL
  const handleSignup = async (values) => {
    try {

      // ✅ IMPORTANT FIX: remove passkey if not required
      if (!restrictedRoles.includes(values.role)) {
        values.passkey = null
      }

      const res = await fetch("http://127.0.0.1:8000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await res.json()
      console.log("Response:", data)

      if (data.message) {
        message.success(data.message)
      } else {
        message.error(data.error || "Signup failed")
      }

    } catch (error) {
      console.log(error)
      message.error("Server error. Please try again.")
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
            rules={[{ required: true, message: 'Please enter your email' }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
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
              onChange={(value) =>
                setShowPasskey(restrictedRoles.includes(value))
              }
            >
              <Select.Option value="customer">Customer</Select.Option>
              <Select.Option value="admin">Admin 🔒</Select.Option>
              <Select.Option value="accountant">Accountant 🔒</Select.Option>
              <Select.Option value="data_entry">Data Entry 🔒</Select.Option>
            </Select>
          </Form.Item>

          {/* ✅ Passkey only for restricted roles */}
          {showPasskey && (
            <Form.Item
              label="Role Passkey"
              name="passkey"
              rules={[
                { required: true, message: 'Passkey required for this role' }
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

export default Signup;