import { DashboardOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Card, Drawer, Grid, Result, Spin, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { ApiError, getCurrentUser, type CurrentUser, type Session } from './auth/api'
import { Brand } from './Brand'

const accountDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation">
      <NavLink className="nav-link" to="/" end onClick={onNavigate}>
        <DashboardOutlined aria-hidden="true" />
        Overview
      </NavLink>
    </nav>
  )
}

function MobileNavigation() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <Button
        className="mobile-menu-button"
        type="text"
        icon={<MenuOutlined />}
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      />
      <Drawer title={<Brand />} placement="left" size={248} open={open} onClose={close}>
        <Navigation onNavigate={close} />
      </Drawer>
    </>
  )
}

function Overview({ user }: { user: CurrentUser }) {
  return (
    <main className="workspace-content">
      <h1>Overview</h1>
      <Card className="account-card" title={<h2>Account</h2>}>
        <dl className="account-details">
          <div>
            <dt>Email</dt>
            <dd>{user.email ?? 'Unavailable'}</dd>
          </div>
          <div>
            <dt>{user.roles.length === 1 ? 'Role' : 'Roles'}</dt>
            <dd>{user.roles.join(', ') || 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{accountDate.format(new Date(user.createdAtUtc))}</dd>
          </div>
        </dl>
      </Card>
    </main>
  )
}

export default function Workspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const screens = Grid.useBreakpoint()
  const profile = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: ({ signal }) => getCurrentUser(session.accessToken, signal),
    retry: false,
  })
  const status = profile.error instanceof ApiError ? profile.error.status : null

  useEffect(() => {
    if (status === 401) onLogout()
  }, [onLogout, status])

  if (status === 401 || profile.isPending) {
    return <main className="workspace-feedback"><Spin tip="Loading account…" size="large"><span /></Spin></main>
  }

  if (profile.isError) {
    return (
      <main className="workspace-feedback">
        <Result
          status={status === 403 ? '403' : 'error'}
          title={status === 403 ? 'Access denied' : 'Unable to load your account'}
          extra={[
            status !== 403 && <Button key="retry" type="primary" onClick={() => void profile.refetch()}>Try again</Button>,
            <Button key="logout" onClick={onLogout}>Sign out</Button>,
          ]}
        />
      </main>
    )
  }

  const user = profile.data
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <Navigation />
      </aside>
      <header className="workspace-header">
        {!screens.md && <MobileNavigation />}
        <div className="header-account">
          <Avatar className="account-avatar" icon={<UserOutlined />} />
          <div className="header-identity">
            <span className="header-email">{user.email ?? 'Account'}</span>
            {user.roles.length > 0 && <Tag className="role-tag">{user.roles.join(', ')}</Tag>}
          </div>
        </div>
        <Button onClick={onLogout} icon={<LogoutOutlined />} aria-label="Sign out">
          <span className="sign-out-label">Sign out</span>
        </Button>
      </header>
      <Overview user={user} />
    </div>
  )
}
