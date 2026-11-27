import { useQuery } from '@tanstack/react-query'
import { Empty, Table } from 'antd'
import { Link, Navigate, useOutletContext } from 'react-router'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import '../inventory/inventory.css'
import { getAssignedAssets, requestKeys, type AssignedAsset, type EmployeeAccess } from './api'

function AssignedList({ token }: { token: string }) {
  const assets = useQuery({
    queryKey: requestKeys.assigned,
    queryFn: ({ signal }) => getAssignedAssets(token, signal),
    retry: false,
  })
  return (
    <main className="workspace-content">
      <div className="inventory-heading"><h1>Assigned Assets</h1></div>
      <section className="inventory-panel" aria-label="Assigned assets">
        {assets.isError ? <div className="inventory-message">
          <InventoryError onRetry={() => void assets.refetch()}>Unable to load assigned assets.</InventoryError>
        </div> : assets.isPending ? <InventorySkeleton label="Loading assigned assets" /> : (
          <Table<AssignedAsset> rowKey="assetId" size="middle" dataSource={assets.data} scroll={{ x: 540 }}
            loading={assets.isFetching} pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No assets assigned to you" /> }}
            columns={[
              { title: 'Asset', dataIndex: 'name' },
              { title: 'Code', dataIndex: 'assetCode' },
              { title: 'Category', dataIndex: 'categoryName' },
              { title: 'Request', render: (_, asset) => <Link to={'/requests/' + asset.requestId}>#{asset.requestId}</Link> },
            ]} />
        )}
      </section>
    </main>
  )
}

export default function AssignedAssetsPage() {
  const { accessToken, isEmployee } = useOutletContext<EmployeeAccess>()
  return isEmployee ? <AssignedList token={accessToken} /> : <Navigate to="/assets" replace />
}
