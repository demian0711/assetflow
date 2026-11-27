import { Card } from 'antd'
import { useOutletContext } from 'react-router'
import type { CurrentUser } from './auth/api'
import { formatDate } from './dateFormat'

export default function Overview() {
  const { user } = useOutletContext<{ user: CurrentUser }>()
  return (
    <main className="workspace-content">
      <div className="inventory-heading"><h1>Account</h1></div>
      <Card className="account-card">
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
            <dd>{formatDate(user.createdAtUtc)}</dd>
          </div>
        </dl>
      </Card>
    </main>
  )
}
