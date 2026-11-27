import { Tag } from 'antd'
import { requestStatuses, type RequestStatus } from './api'

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const option = requestStatuses.find(item => item.value === status)
  return <Tag color={option?.color}>{option?.label ?? status}</Tag>
}
