import { authorizedRequest } from '../auth/api'

export type AuditEntry = {
  id: number
  actor: string | null
  action: string
  entityType: string
  entityId: string
  occurredAtUtc: string
}
export type AuditFilters = { actor?: string; action?: string; entityType?: string; page: number; pageSize: number }
type AuditPage = { items: AuditEntry[]; total: number; page: number; pageSize: number }
type Dashboard = {
  metrics: { key: string; count: number }[]
  categories: { name: string; count: number }[]
  activity: AuditEntry[]
}
export const auditActions: Record<string, string> = {
  RequestCreated: 'Request submitted',
  RequestApproved: 'Request approved',
  RequestRejected: 'Request rejected',
  RequestCancelled: 'Request cancelled',
  RequestIssued: 'Asset issued',
  RequestReturned: 'Asset returned',
  AssetRetired: 'Asset retired',
}

export function getDashboard(token: string, signal: AbortSignal) {
  return authorizedRequest<Dashboard>(token, '/api/dashboard', { signal })
}

export function getAudit(token: string, filters: AuditFilters, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) })
  if (filters.actor?.trim()) params.set('actor', filters.actor.trim())
  if (filters.action) params.set('action', filters.action)
  if (filters.entityType) params.set('entityType', filters.entityType)
  return authorizedRequest<AuditPage>(token, '/api/admin/audit?' + params.toString(), { signal })
}
