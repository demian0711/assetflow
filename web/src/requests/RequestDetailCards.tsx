import { Card, Empty, Timeline } from 'antd'
import type { RequestDetail } from './api'
import { RequestStatusBadge } from './RequestStatusBadge'

const eventNames: Record<string, string> = {
  RequestCreated: 'Request submitted',
  RequestCancelled: 'Request cancelled',
  RequestApproved: 'Request approved',
  RequestRejected: 'Request rejected',
  RequestIssued: 'Asset issued',
  RequestReturned: 'Asset returned',
}
const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

export function RequestDetailCards({ detail, showEmployee = false }: { detail: RequestDetail; showEmployee?: boolean }) {
  const { request, timeline } = detail
  return (
    <div className="request-detail-grid">
      <Card title="Details">
        <dl className="request-fields">
          {showEmployee && <div><dt>Employee</dt><dd>{request.employeeEmail ?? 'Unavailable'}</dd></div>}
          <div><dt>Category</dt><dd>{request.categoryName}</dd></div>
          <div><dt>Status</dt><dd><RequestStatusBadge status={request.status} /></dd></div>
          <div><dt>Created</dt><dd><time dateTime={request.createdAtUtc}>
            {dateTime.format(new Date(request.createdAtUtc))}
          </time></dd></div>
          <div><dt>Purpose</dt><dd className="request-purpose">{request.purpose}</dd></div>
          {request.assetCode && <div><dt>Asset code</dt><dd>{request.assetCode}</dd></div>}
          {request.rejectionReason && (
            <div><dt>Rejection reason</dt><dd className="request-purpose">{request.rejectionReason}</dd></div>
          )}
        </dl>
      </Card>
      <Card title="Timeline">
        {timeline.length ? <Timeline items={timeline.map(event => ({
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
  )
}
