import React from 'react'

import {
  Form,
  Input,
  Button,
  Typography,
  Checkbox,
} from 'antd'

import {
  LoginOutlined,
} from '@ant-design/icons'

import { Link } from 'react-router-dom'

import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text } = Typography

const Login = () => {

  const handleLogin = (values) => {
    console.log(values)
  }

  return (
    <AuthLayout
      leftContent={<BrandSection />}
    >
      <AuthCard>

        <Title level={2} className="auth-title">
          Welcome Back
        </Title>

        <Text className="auth-subtitle">
          Login to continue to Auto-Nidhi
        </Text>

        <Form
          layout="vertical"
          onFinish={handleLogin}
        >

          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: 'Please enter email',
              },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: 'Please enter password',
              },
            ]}
          >
            <Input.Password
              placeholder="Enter password"
            />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <Checkbox>
              Remember me
            </Checkbox>

            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            icon={<LoginOutlined />}
            className="auth-btn"
          >
            Login
          </Button>

        </Form>

        <div className="auth-footer">
          Don’t have an account?{' '}
          <Link to="/signup">
            Create account
          </Link>
        </div>

      </AuthCard>
    </AuthLayout>
  )
}

export default Login