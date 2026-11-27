import { useQuery } from '@tanstack/react-query'
import { Card, Empty, Statistic } from 'antd'
import { Link, useOutletContext } from 'react-router'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import type { InventoryAccess } from '../inventory/api'
import '../inventory/inventory.css'
import { ActivityTable } from './ActivityTable'
import { getDashboard } from './api'
import './reporting.css'

const metricLabels: Record<string, string> = {
  totalAssets: 'Total assets',
  available: 'Available',
  inUse: 'In use',
  pendingRequests: 'Pending requests',
  assignedAssets: 'Assigned assets',
  myRequests: 'My requests',
  returned: 'Returned requests',
}

function CategoryChart({ items }: { items: { name: string; count: number }[] }) {
  const maximum = items.reduce((max, item) => Math.max(max, item.count), 1)
  return (
    <Card className="category-chart" title={<h2>Assets by Category</h2>}>
      {items.length ? <ul className="category-bars">
        {items.map(item => (
          <li key={item.name}>
            <span>{item.name}</span>
            <span>{item.count}</span>
            <div className="category-track" aria-hidden="true">
              <div style={{ width: item.count / maximum * 100 + '%' }} />
            </div>
          </li>
        ))}
      </ul> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No categories yet" />}
    </Card>
  )
}

export default function DashboardPage() {
  const { accessToken, isAdmin } = useOutletContext<InventoryAccess>()
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => getDashboard(accessToken, signal),
    retry: false,
  })
  return (
    <main className="workspace-content">
      <div className="inventory-heading"><h1>Dashboard</h1></div>
      {dashboard.isPending ? <InventorySkeleton label="Loading dashboard" />
        : dashboard.isError ? <InventoryError onRetry={() => void dashboard.refetch()}>Unable to load the dashboard.</InventoryError>
        : <>
          <div className="dashboard-metrics">
            {dashboard.data.metrics.map(item => (
              <Card key={item.key}><Statistic title={metricLabels[item.key]} value={item.count} /></Card>
            ))}
          </div>
          <div className={isAdmin ? 'dashboard-content' : undefined}>
            {isAdmin && <CategoryChart items={dashboard.data.categories} />}
            <section className="inventory-panel" aria-labelledby="recent-activity-heading">
              <div className="report-section-heading">
                <h2 id="recent-activity-heading">Recent Activity</h2>
                {isAdmin && <Link to="/admin/audit">Audit History</Link>}
              </div>
              <ActivityTable items={dashboard.data.activity} isAdmin={isAdmin} empty="No recent activity" />
            </section>
          </div>
        </>}
    </main>
  )
}
