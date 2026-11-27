import { PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Empty, Select, Table } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import '../inventory/inventory.css'
import { getRequests, requestKeys, requestStatuses, type EmployeeAccess, type EmployeeRequest, type RequestStatus } from './api'
import { NewRequestDrawer } from './NewRequestDrawer'
import { RequestDetails } from './RequestDetails'
import { RequestStatusBadge } from './RequestStatusBadge'
import './requests.css'

const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

function MyRequests({ token }: { token: string }) {
  const [status, setStatus] = useState<RequestStatus>()
  const [newRequestOpen, setNewRequestOpen] = useState(false)
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const cache = useQueryClient()
  const requests = useQuery({
    queryKey: [...requestKeys.list, status],
    queryFn: ({ signal }) => getRequests(token, status, signal),
    retry: false,
  })
  const filter = (value?: RequestStatus) => { setStatus(value); setPage(1) }

  return (
    <main className="workspace-content">
      <div className="inventory-heading">
        <h1>My Requests</h1>
        <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={() => setNewRequestOpen(true)}>
          New Request
        </Button>
      </div>
      <section className="inventory-panel" aria-label="My equipment requests">
        <div className="request-filters">
          <Select allowClear virtual={false} aria-label="Filter by status" placeholder="All statuses"
            value={status} options={requestStatuses} onChange={filter} />
        </div>
        {requests.isError ? (
          <div className="inventory-message">
            <InventoryError onRetry={() => void requests.refetch()}>Unable to load requests.</InventoryError>
          </div>
        ) : requests.isPending ? <InventorySkeleton label="Loading requests" /> : (
          <Table<EmployeeRequest> rowKey="id" size="middle" dataSource={requests.data} scroll={{ x: 580 }}
            loading={requests.isFetching} pagination={{ current: page, pageSize: 10, hideOnSinglePage: true, onChange: setPage }}
            locale={{ emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={status ? 'No matching requests' : 'No requests yet'}>
                {status && <Button onClick={() => filter()}>Clear filter</Button>}
              </Empty>
            ) }}
            columns={[
              { title: 'Category', width: 170, render: (_, request) => (
                <Link to={'/requests/' + request.id} aria-label={'View request #' + request.id + ' for ' + request.categoryName}>
                  {request.categoryName}
                </Link>
              ) },
              { title: 'Status', width: 120, render: (_, request) => <RequestStatusBadge status={request.status} /> },
              { title: 'Created', width: 130, render: (_, request) => (
                <time dateTime={request.createdAtUtc}>{date.format(new Date(request.createdAtUtc))}</time>
              ) },
              { title: 'Purpose', dataIndex: 'purpose', ellipsis: true },
            ]} />
        )}
      </section>
      {newRequestOpen && <NewRequestDrawer token={token} onClose={() => setNewRequestOpen(false)}
        onCreated={detail => {
          cache.setQueryData(requestKeys.detail(detail.request.id), detail)
          void cache.invalidateQueries({ queryKey: requestKeys.list })
          setNewRequestOpen(false)
          void navigate('/requests/' + detail.request.id)
        }} />}
    </main>
  )
}

export default function RequestsPage() {
  const { accessToken, isEmployee } = useOutletContext<EmployeeAccess>()
  const { id } = useParams()
  if (!isEmployee) return <Navigate to="/assets" replace />
  if (id === undefined) return <MyRequests token={accessToken} />
  const requestId = Number(id)
  if (!/^\d+$/.test(id) || requestId < 1 || requestId > 2147483647) return <Navigate to="/requests" replace />
  return <RequestDetails key={requestId} token={accessToken} id={requestId} />
}
