import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Input, Select } from 'antd'
import { useState } from 'react'
import { Navigate, useOutletContext } from 'react-router'
import { InventoryError, InventorySkeleton } from '../inventory/InventoryFeedback'
import type { InventoryAccess } from '../inventory/api'
import '../inventory/inventory.css'
import { ActivityTable } from './ActivityTable'
import { auditActions, getAudit, type AuditFilters } from './api'
import './reporting.css'

function AuditHistory({ token }: { token: string }) {
  const [actor, setActor] = useState('')
  const [filters, setFilters] = useState<AuditFilters>({ page: 1, pageSize: 10 })
  const audit = useQuery({
    queryKey: ['audit', filters],
    queryFn: ({ signal }) => getAudit(token, filters, signal),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const update = (change: Partial<AuditFilters>) =>
    setFilters(current => ({ ...current, ...change, page: 1 }))
  const hasFilters = Boolean(filters.actor || filters.action || filters.entityType)

  return (
    <main className="workspace-content">
      <div className="inventory-heading"><h1>Audit History</h1></div>
      <section className="inventory-panel" aria-label="Audit events">
        <form className="audit-filters" onSubmit={event => { event.preventDefault(); update({ actor: actor.trim() }) }}>
          <Input aria-label="Actor email" placeholder="Actor email" maxLength={256}
            value={actor} onChange={event => setActor(event.target.value)} />
          <Select allowClear virtual={false} aria-label="Filter by action" placeholder="All actions"
            value={filters.action} onChange={action => update({ action })}
            options={Object.entries(auditActions).map(([value, label]) => ({ value, label }))} />
          <Select allowClear virtual={false} aria-label="Filter by object" placeholder="All objects"
            value={filters.entityType} onChange={entityType => update({ entityType })}
            options={[{ value: 'AssetRequest', label: 'Request' }, { value: 'Asset', label: 'Asset' }]} />
          <Button type="primary" htmlType="submit">Apply Filters</Button>
          {hasFilters && <Button onClick={() => {
            setActor('')
            setFilters(current => ({ page: 1, pageSize: current.pageSize }))
          }}>Clear Filters</Button>}
        </form>
        {audit.isError ? <div className="inventory-message">
          <InventoryError onRetry={() => void audit.refetch()}>Unable to load audit history.</InventoryError>
        </div> : audit.isPending ? <InventorySkeleton label="Loading audit history" /> : (
          <ActivityTable items={audit.data.items} isAdmin loading={audit.isFetching}
            empty={hasFilters ? 'No events match these filters' : 'No audit events yet'}
            pagination={{
              current: audit.isPlaceholderData ? filters.page : audit.data.page,
              total: audit.data.total,
              pageSize: filters.pageSize,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: total => total + (total === 1 ? ' event' : ' events'),
              hideOnSinglePage: audit.data.total === 0,
              onChange: (page, pageSize) => setFilters(current => ({
                ...current, page: current.pageSize === pageSize ? page : 1, pageSize,
              })),
            }} />
        )}
      </section>
    </main>
  )
}

export default function AuditHistoryPage() {
  const { accessToken, isAdmin } = useOutletContext<InventoryAccess>()
  return isAdmin ? <AuditHistory token={accessToken} /> : <Navigate to="/dashboard" replace />
}
