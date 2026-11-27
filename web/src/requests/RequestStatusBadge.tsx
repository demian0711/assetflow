import { StatusTag } from '../StatusTag'
import { requestStatuses, type RequestStatus } from './api'

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const option = requestStatuses.find(item => item.value === status)
  return <StatusTag tone={option?.color} label={option?.label ?? status} />
}
