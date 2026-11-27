import { authorizedRequest } from '../auth/api'

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Issued' | 'Returned'
export type NewRequest = { categoryId: number; purpose: string }
export type EmployeeAccess = { accessToken: string; isEmployee: boolean }

export type EmployeeRequest = NewRequest & {
  id: number
  categoryName: string
  status: RequestStatus
  createdAtUtc: string
  employeeEmail: string | null
  assetCode: string | null
  rejectionReason: string | null
}
export type AssignedAsset = {
  requestId: number
  assetId: number
  assetCode: string
  name: string
  categoryName: string
}
export type RequestDetail = {
  request: EmployeeRequest
  timeline: { action: string; occurredAtUtc: string }[]
}

export const requestStatuses: { value: RequestStatus; label: string; color: string }[] = [
  { value: 'Pending', label: 'Pending', color: 'gold' },
  { value: 'Approved', label: 'Approved', color: 'green' },
  { value: 'Rejected', label: 'Rejected', color: 'red' },
  { value: 'Cancelled', label: 'Cancelled', color: 'default' },
  { value: 'Issued', label: 'Issued', color: 'blue' },
  { value: 'Returned', label: 'Returned', color: 'cyan' },
]

export const requestKeys = {
  list: ['requests', 'list'],
  assigned: ['requests', 'assigned-assets'],
  detail: (id: number) => ['requests', 'detail', id],
}

const path = '/api/requests'

export function getRequests(token: string, status: RequestStatus | undefined, signal: AbortSignal) {
  const url = status ? path + '?' + new URLSearchParams({ status }).toString() : path
  return authorizedRequest<EmployeeRequest[]>(token, url, { signal })
}

export function getRequest(token: string, id: number, signal: AbortSignal) {
  return authorizedRequest<RequestDetail>(token, path + '/' + id, { signal })
}

export function createRequest(token: string, input: NewRequest) {
  return authorizedRequest<RequestDetail>(token, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function cancelRequest(token: string, id: number) {
  return authorizedRequest<RequestDetail>(token, path + '/' + id + '/cancel', { method: 'POST' })
}

export function getAssignedAssets(token: string, signal: AbortSignal) {
  return authorizedRequest<AssignedAsset[]>(token, path + '/assigned-assets', { signal })
}
