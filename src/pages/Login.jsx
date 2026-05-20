import React from 'react'
import { Form, Input, Button, Card, message } from 'antd'

const Login = () => {

  // ✅ LOGIN API CALL
  const onFinish = async (values) => {
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
    <div>
      <Card
        title="Login"
        style={{ maxWidth: 400, margin: "auto", marginTop: 100 }}
      >

        {/* ✅ CONNECT FORM */}
        <Form layout="vertical" onFinish={onFinish}>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required" }
            ]}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Password is required" }
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
          >
            Login
          </Button>

        </Form>

      </Card>
    </div>
  )
}

export default Login