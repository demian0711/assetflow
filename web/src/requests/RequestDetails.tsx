import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Empty, Modal, Timeline } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../auth/api'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import { cancelRequest, getRequest, requestKeys } from './api'
import { RequestStatusBadge } from './RequestStatusBadge'

const eventNames: Record<string, string> = {
  RequestCreated: 'Request submitted',
  RequestCancelled: 'Request cancelled',
}
const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

export function RequestDetails({ token, id }: { token: string; id: number }) {
  const cache = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const detail = useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: ({ signal }) => getRequest(token, id, signal),
    retry: false,
  })
  const cancel = useMutation({
    mutationFn: () => cancelRequest(token, id),
    onSuccess: result => {
      cache.setQueryData(requestKeys.detail(id), result)
      void cache.invalidateQueries({ queryKey: requestKeys.list })
      setConfirming(false)
    },
    onError: error => {
      if (error instanceof ApiError && error.status === 409) void detail.refetch()
    },
  })

  const request = detail.data?.request
  const canCancel = request?.status === 'Pending' || request?.status === 'Approved'
  return (
    <main className="workspace-content">
      <Link className="request-back" to="/requests">Back to My Requests</Link>
      <div className="inventory-heading">
        <h1>Request #{id}</h1>
        {canCancel && <Button danger onClick={() => { cancel.reset(); setConfirming(true) }}>Cancel Request</Button>}
      </div>
      {detail.isPending ? <InventorySkeleton label="Loading request" /> : detail.isError ? (
        detail.error instanceof ApiError && detail.error.status === 404
          ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Request not found" />
          : <InventoryError onRetry={() => void detail.refetch()}>Unable to load the request.</InventoryError>
      ) : (
        <div className="request-detail-grid">
          <Card title="Details">
            <dl className="request-fields">
              <div><dt>Category</dt><dd>{detail.data.request.categoryName}</dd></div>
              <div><dt>Status</dt><dd><RequestStatusBadge status={detail.data.request.status} /></dd></div>
              <div><dt>Created</dt><dd><time dateTime={detail.data.request.createdAtUtc}>
                {dateTime.format(new Date(detail.data.request.createdAtUtc))}
              </time></dd></div>
              <div><dt>Purpose</dt><dd className="request-purpose">{detail.data.request.purpose}</dd></div>
            </dl>
          </Card>
          <Card title="Timeline">
            {detail.data.timeline.length ? <Timeline items={detail.data.timeline.map(event => ({
              content: (
                <>
                  <div>{eventNames[event.action] ?? event.action}</div>
                  <time className="request-event-time" dateTime={event.occurredAtUtc}>
                    {dateTime.format(new Date(event.occurredAtUtc))}
                  </time>
                </>
              ),
            }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recorded events" />}
          </Card>
        </div>
      )}
      {confirming && (
        <Modal title="Cancel this request?" open okText="Cancel Request" cancelText="Keep Request"
          okButtonProps={{ danger: true }} confirmLoading={cancel.isPending}
          onOk={() => cancel.mutate()} onCancel={() => { if (!cancel.isPending) setConfirming(false) }}>
          <p>This request will be marked Cancelled.</p>
          {cancel.isError && <Alert showIcon type="error"
            title={cancel.error instanceof ApiError ? cancel.error.message : 'Unable to cancel the request.'} />}
        </Modal>
      )}
    </main>
  )
}
