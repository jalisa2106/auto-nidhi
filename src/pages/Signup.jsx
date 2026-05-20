import React, { useState } from 'react'

import {
  Form,
  Input,
  Select,
  Button,
  Typography,
} from 'antd'

import {
  UserAddOutlined,
} from '@ant-design/icons'

import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text, Link } = Typography

const Signup = () => {
  const [showPasskey, setShowPasskey] = useState(false)

  const restrictedRoles = [
    'admin',
    'accountant',
    'data_entry',
  ]

  const handleSignup = (values) => {
    console.log(values)
  }

  return (
    <AuthLayout
      leftContent={<BrandSection />}
    >
      <AuthCard>

        <Title level={2} className="auth-title">
          Create Account
        </Title>

        <Text className="auth-subtitle">
          Start managing operations smarter
        </Text>

        <Form layout="vertical" onFinish={handleSignup}>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: 'Please enter your email',
              },
            ]}
          >
            <Input
              placeholder="you@example.com"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: 'Please enter your email',
              },
            ]}
          >
            <Input.Password
              placeholder="Enter password"
            />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              {
                required: true,
                message: 'Please confirm your password',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (
                    !value ||
                    getFieldValue('password') === value
                  ) {
                    return Promise.resolve()
                  }

                  return Promise.reject(
                    new Error('Passwords do not match')
                  )
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm password"
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[
              {
                required: true,
                message: 'Please enter your email',
              },
            ]}
          >
            <Select
              placeholder="Select role"
              onChange={(value) =>
                setShowPasskey(
                  restrictedRoles.includes(value)
                )
              }
            >
              <Select.Option value="customer">
                Customer
              </Select.Option>

              <Select.Option value="admin">
                Admin 🔒
              </Select.Option>

              <Select.Option value="accountant">
                Accountant 🔒
              </Select.Option>

              <Select.Option value="data_entry">
                Data Entry 🔒
              </Select.Option>
            </Select>
          </Form.Item>

          {showPasskey && (
            <Form.Item
              label="Role Passkey"
              name="passkey"
            rules={[
              {
                required: true,
                message: 'Please enter your email',
              },
            ]}
            >
              <Input.Password
                placeholder="Enter role passkey"
              />
            </Form.Item>
          )}

          <Button
            type="primary"
            block
            icon={<UserAddOutlined />}
            htmlType='submit'
            className="auth-btn"
          >
            Create Account
          </Button>

        </Form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">
            Sign in
          </Link>
        </div>

      </AuthCard>
    </AuthLayout>
  )
}

export default Signup