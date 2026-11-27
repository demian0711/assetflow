import { Card } from 'antd'
import { useOutletContext } from 'react-router'
import type { CurrentUser } from './auth/api'

const accountDate = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })

export default function Overview() {
  const { user } = useOutletContext<{ user: CurrentUser }>()
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
