import { InventoryTable } from '../InventoryTable'
import { formatDateTime } from '../dateFormat'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Form, Input, Modal, Select, Space } from 'antd'
import { useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router'
import { ApiError } from '../auth/api'
import { formFieldErrors, inventoryKeys, type InventoryAccess } from '../inventory/api'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import '../inventory/inventory.css'
import { requestStatuses, type EmployeeRequest, type RequestStatus } from './api'
import { adminRequestKeys, getAdminRequest, getAdminRequests, getAvailableAssets, runAdminAction,
  type ActionInput, type AdminAction } from './adminApi'
import { RequestDetailCards } from './RequestDetailCards'
import { RequestStatusBadge } from './RequestStatusBadge'
import './requests.css'

const labels: Record<AdminAction, string> = {
  approve: 'Approve', reject: 'Reject', issue: 'Issue Asset', return: 'Receive Return',
}
const actionsByStatus: Partial<Record<RequestStatus, AdminAction[]>> = {
  Pending: ['approve', 'reject'],
  Approved: ['issue'],
  Issued: ['return'],
}

function Queue({ token }: { token: string }) {
  const [status, setStatus] = useState<RequestStatus | undefined>('Pending')
  const [page, setPage] = useState(1)
  const queue = useQuery({
    queryKey: adminRequestKeys.list(status),
    queryFn: ({ signal }) => getAdminRequests(token, status, signal),
    retry: false,
  })

  return (
    <main className="workspace-content">
      <div className="inventory-heading"><h1>Admin Requests</h1></div>
      <section className="inventory-panel" aria-label="Request queue">
        <div className="request-filters">
          <Select allowClear virtual={false} aria-label="Filter by status" placeholder="All statuses"
            value={status} options={requestStatuses} onChange={value => { setStatus(value); setPage(1) }} />
        </div>
        {queue.isError ? <div className="inventory-message">
          <InventoryError onRetry={() => void queue.refetch()}>Unable to load the request queue.</InventoryError>
        </div> : queue.isPending ? <InventorySkeleton label="Loading requests" /> : (
          <InventoryTable<EmployeeRequest> rowKey="id" dataSource={queue.data} scroll={{ x: 720 }}
            loading={queue.isFetching} pagination={{ current: page, pageSize: 10, onChange: setPage, hideOnSinglePage: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={status ? 'No requests with this status' : 'No requests yet'} /> }}
            columns={[
              { title: 'Request', width: 112, render: (_, row) => <Link to={'/admin/requests/' + row.id}>#{row.id}</Link> },
              { title: 'Employee', dataIndex: 'employeeEmail', width: 220 },
              { title: 'Category', dataIndex: 'categoryName', width: 160 },
              { title: 'Status', width: 112, render: (_, row) => <RequestStatusBadge status={row.status} /> },
              { title: 'Created', render: (_, row) => <time dateTime={row.createdAtUtc}>{formatDateTime(row.createdAtUtc)}</time> },
            ]} />
        )}
      </section>
    </main>
  )
}

function AdminRequestDetails({ token, id }: { token: string; id: number }) {
  const [action, setAction] = useState<AdminAction>()
  const [conflict, setConflict] = useState(false)
  const [form] = Form.useForm<ActionInput>()
  const cache = useQueryClient()
  const detail = useQuery({
    queryKey: adminRequestKeys.detail(id),
    queryFn: ({ signal }) => getAdminRequest(token, id, signal),
    retry: false,
  })
  const available = useQuery({
    queryKey: adminRequestKeys.available(id),
    queryFn: ({ signal }) => getAvailableAssets(token, id, signal),
    enabled: action === 'issue',
    retry: false,
  })

  function refresh() {
    void cache.invalidateQueries({ queryKey: adminRequestKeys.root, refetchType: 'all' })
    void cache.invalidateQueries({ queryKey: ['requests'] })
    void cache.invalidateQueries({ queryKey: inventoryKeys.assets })
  }

  function changed() {
    setAction(undefined)
    setConflict(true)
    refresh()
  }

  const mutation = useMutation({
    mutationFn: (submission: { action: AdminAction; values: ActionInput }) =>
      runAdminAction(token, id, submission.action, submission.values),
    onSuccess: updated => {
      cache.setQueryData(adminRequestKeys.detail(id), updated)
      setAction(undefined)
      refresh()
    },
    onError: error => {
      if (error instanceof ApiError && error.status === 409) {
        changed()
      } else {
        form.setFields(formFieldErrors(error, ['reason', 'assetId'] as const))
      }
    },
  })

  const allowed = detail.data ? actionsByStatus[detail.data.request.status] ?? [] : []
  const availableChanged = available.error instanceof ApiError && available.error.status === 409
  return (
    <main className="workspace-content">
      <Link className="request-back" to="/admin/requests">Back to Admin Requests</Link>
      <div className="inventory-heading admin-request-heading">
        <h1>Request #{id}</h1>
        <Space wrap>
          {allowed.map(item => (
            <Button key={item} type={item === 'reject' ? 'default' : 'primary'} danger={item === 'reject'}
              onClick={() => { mutation.reset(); setConflict(false); setAction(item) }}>
              {labels[item]}
            </Button>
          ))}
        </Space>
      </div>
      {conflict && <Alert className="request-conflict" type="warning" showIcon
        title="The request or asset changed. Review the latest data before trying again." />}
      {detail.isPending ? <InventorySkeleton label="Loading request" /> : detail.isError ? (
        detail.error instanceof ApiError && detail.error.status === 404
          ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Request not found" />
          : <InventoryError onRetry={() => void detail.refetch()}>Unable to load the request.</InventoryError>
      ) : <RequestDetailCards detail={detail.data} showEmployee />}
      {action && (
        <Modal open title={labels[action] + '?'} okText={labels[action]} confirmLoading={mutation.isPending}
          okButtonProps={{ danger: action === 'reject', disabled: action === 'issue' && (!available.isSuccess || !available.data?.length) }}
          onOk={() => form.submit()} onCancel={() => { if (!mutation.isPending) setAction(undefined) }}>
          <Form form={form} clearOnDestroy layout="vertical" disabled={mutation.isPending}
            onFinish={values => { if (!mutation.isPending) mutation.mutate({ action, values }) }}>
            {action === 'approve' && <p>Approve the request so it can be issued later.</p>}
            {action === 'return' && <p>Mark the request Returned and make the asset available again.</p>}
            {action === 'reject' && <Form.Item label="Reason" name="reason" rules={[
              { required: true, whitespace: true, message: 'Enter a rejection reason.' },
              { max: 500, message: 'Use 500 characters or fewer.' },
            ]}><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item>}
            {action === 'issue' && (
              <>
                {available.isError && (availableChanged
                  ? <InventoryError onRetry={changed}>The request has changed.</InventoryError>
                  : <InventoryError onRetry={() => void available.refetch()}>Unable to load available assets.</InventoryError>)}
                {available.isSuccess && !available.data.length && <Alert type="info" title="No available assets in this category." />}
                <Form.Item label="Available asset" name="assetId" rules={[{ required: true, message: 'Choose an asset.' }]}>
                  <Select aria-label="Available asset" placeholder="Choose an asset" loading={available.isPending}
                    options={available.data?.map(asset => ({ label: asset.assetCode + ' · ' + asset.name, value: asset.id }))} />
                </Form.Item>
              </>
            )}
            {mutation.isError && !formFieldErrors(mutation.error, ['reason', 'assetId']).length && (
              <Alert type="error" showIcon title={mutation.error instanceof ApiError ? mutation.error.message : 'Unable to save the change.'} />
            )}
          </Form>
        </Modal>
      )}
    </main>
  )
}

export default function AdminRequestsPage() {
  const { accessToken, isAdmin } = useOutletContext<InventoryAccess>()
  const { id } = useParams()
  if (!isAdmin) return <Navigate to="/assets" replace />
  if (id === undefined) return <Queue token={accessToken} />
  const requestId = Number(id)
  if (!/^\d+$/.test(id) || requestId < 1 || requestId > 2147483647) return <Navigate to="/admin/requests" replace />
  return <AdminRequestDetails key={requestId} token={accessToken} id={requestId} />
}
