import React, { useState } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Typography,
  Card,
} from 'antd'

import {
  CarOutlined,
  UserAddOutlined,
} from '@ant-design/icons'

import './Signup.css'

import { useEffect } from "react";

useEffect(() => {
  fetch("http://127.0.0.1:8000/api/test")
    .then((res) => res.json())
    .then((data) => {
      console.log("Backend Response:", data);
    })
    .catch((err) => console.log("Error:", err));
}, []);

const { Title, Text, Link } = Typography

const Signup = () => {
  const [showPasskey, setShowPasskey] = useState(false)

  const restrictedRoles = ['admin', 'accountant', 'data_entry']

  return (
    <div className="signup-container">
      <Card className="signup-card">
        <div className="signup-header">
          <CarOutlined className="logo" />

          <Title level={2} className="title">
            Auto-Nidhi
          </Title>

          <Text className="subtitle">
            Create your account
          </Text>
        </div>

        <Form layout="vertical">
          <Form.Item
            label="Email address"
            name="email"
          >
            <Input
              size="large"
              placeholder="you@example.com"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
          >
            <Input.Password
              size="large"
              placeholder="Min. 8 characters"
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
                  if (!value || getFieldValue('password') === value) {
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
              size="large"
              placeholder="Confirm your password"
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
          >
            <Select
              size="large"
              placeholder="Select your role"
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
              label="Passkey"
              name="passkey"
            >
              <Input.Password
                size="large"
                placeholder="Enter role passkey"
              />
            </Form.Item>
          )}

          <Button
            block
            size="large"
            htmlType="submit"
            icon={<UserAddOutlined />}
            className="signup-btn"
          >
            Create account
          </Button>
        </Form>

        <div className="footer">
          <Text>or</Text>

          <div>
            <Text>
              Already have an account?{' '}
            </Text>

            <Link href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Signup