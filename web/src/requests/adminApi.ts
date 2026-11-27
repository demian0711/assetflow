import { authorizedRequest } from '../auth/api'
import type { EmployeeRequest, RequestDetail, RequestStatus } from './api'

export type AdminAction = 'approve' | 'reject' | 'issue' | 'return'
export type ActionInput = { reason?: string; assetId?: number }
type AssetChoice = { id: number; assetCode: string; name: string }

const path = '/api/admin/requests'
export const adminRequestKeys = {
  root: ['admin-requests'],
  list: (status?: RequestStatus) => ['admin-requests', 'list', status],
  detail: (id: number) => ['admin-requests', 'detail', id],
  available: (id: number) => ['admin-requests', 'available', id],
}

export function getAdminRequests(token: string, status: RequestStatus | undefined, signal: AbortSignal) {
  return authorizedRequest<EmployeeRequest[]>(token, status ? path + '?status=' + status : path, { signal })
}

export function getAdminRequest(token: string, id: number, signal: AbortSignal) {
  return authorizedRequest<RequestDetail>(token, path + '/' + id, { signal })
}

export function getAvailableAssets(token: string, id: number, signal: AbortSignal) {
  return authorizedRequest<AssetChoice[]>(token, path + '/' + id + '/available-assets', { signal })
}

export function runAdminAction(token: string, id: number, action: AdminAction, values: ActionInput) {
  const body = action === 'reject' ? { reason: values.reason?.trim() }
    : action === 'issue' ? { assetId: values.assetId } : undefined
  return authorizedRequest<RequestDetail>(token, path + '/' + id + '/' + action, {
    method: 'POST',
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}
