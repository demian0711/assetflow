import { AppstoreOutlined, DashboardOutlined, FileTextOutlined, InboxOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Button, Drawer, Grid, Result, Spin, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ApiError, getCurrentUser, type Session } from './auth/api'
import { Brand } from './Brand'

function Navigation({ isAdmin, isEmployee, onNavigate }: { isAdmin: boolean; isEmployee: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation">
      <NavLink className="nav-link" to="/assets" onClick={onNavigate}>
        <InboxOutlined aria-hidden="true" />
        Assets
      </NavLink>
      {isEmployee && (
        <NavLink className="nav-link" to="/requests" onClick={onNavigate}>
          <FileTextOutlined aria-hidden="true" />
          My Requests
        </NavLink>
      )}
      {isAdmin && (
        <NavLink className="nav-link" to="/categories" onClick={onNavigate}>
          <AppstoreOutlined aria-hidden="true" />
          Categories
        </NavLink>
      )}
      <NavLink className="nav-link" to="/overview" onClick={onNavigate}>
        <DashboardOutlined aria-hidden="true" />
        Overview
      </NavLink>
    </nav>
  )
}

function MobileNavigation({ isAdmin, isEmployee }: { isAdmin: boolean; isEmployee: boolean }) {
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
        <Navigation isAdmin={isAdmin} isEmployee={isEmployee} onNavigate={close} />
      </Drawer>
    </>
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
    return <main className="workspace-feedback"><Spin tip="Loading accountâ€¦" size="large"><span /></Spin></main>
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
  const isAdmin = user.roles.includes('Admin')
  const isEmployee = user.roles.includes('Employee')
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <Navigation isAdmin={isAdmin} isEmployee={isEmployee} />
      </aside>
      <header className="workspace-header">
        {!screens.md && <MobileNavigation isAdmin={isAdmin} isEmployee={isEmployee} />}
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
      <Outlet context={{ user, isAdmin, isEmployee, accessToken: session.accessToken }} />
    </div>
  )
}
