import { Alert, Button, Card, Form, Input } from 'antd'
import { useState } from 'react'
import { Brand } from '../Brand'
import { ApiError, login, type LoginCredentials, type Session } from './api'

export default function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [form] = Form.useForm<LoginCredentials>()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function submit(values: LoginCredentials) {
    if (pending) return
    setPending(true)
    setError(undefined)
    try {
      const session = await login({ email: values.email.trim(), password: values.password })
      onLogin(session)
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        form.setFields([{ name: 'password', errors: [failure.message] }])
        form.focusField('password')
      } else {
        setError('Unable to sign in. Try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="sign-in">
      <Card className="sign-in-card">
        <Brand />
        <h1>Sign in</h1>
        <Form
          name="sign-in"
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={submit}
          onFinishFailed={({ errorFields: [field] }) => {
            if (field) form.focusField(field.name)
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, whitespace: true, message: 'Enter your email.' },
              { type: 'email', transform: (value: string) => value.trim(), message: 'Enter a valid email.' },
              { max: 256, message: 'Use 256 characters or fewer.' },
            ]}
          >
            <Input autoFocus autoComplete="username" inputMode="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Enter your password.' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {error && <Alert className="sign-in-error" title={error} type="error" showIcon />}
          <Button block type="primary" htmlType="submit" loading={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </Form>
      </Card>
    </main>
  )
}
