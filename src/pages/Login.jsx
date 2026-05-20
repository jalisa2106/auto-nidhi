import React from 'react'
import { Form, Input, Button, Typography, Checkbox, message } from 'antd'
import { LoginOutlined } from '@ant-design/icons'

import { Link } from "react-router-dom"
import AuthLayout from '../components/auth/AuthLayout'
import AuthCard from '../components/auth/AuthCard'
import BrandSection from '../components/auth/BrandSection'

const { Title, Text, Link } = Typography

const Login = () => {

  // ✅ LOGIN API CALL
  const handleLogin = async (values) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await res.json()
      console.log("Login Response:", data)

      if (data.message) {
        message.success(data.message)
      } else {
        message.error(data.error || "Login failed")
      }

    } catch (err) {
      console.log(err)
      message.error("Server error")
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
              { required: true, message: 'Please enter email' }
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter password' }
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
            <Checkbox>
              Remember me
            </Checkbox>

            <Link href="#">
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
          Don’t have an account?{' '}
          <Link href="/signup">
            Create account
          </Link>
        </div>

      </AuthCard>
    </AuthLayout>
  )
}

export default Login