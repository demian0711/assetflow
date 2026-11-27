import { InventoryTable } from '../InventoryTable'
import { Empty } from 'antd'
import type { TableProps } from 'antd'
import { Link } from 'react-router'
import { formatDateTime } from '../dateFormat'
import { auditActions, type AuditEntry } from './api'

export function ActivityTable({ items, isAdmin, loading, pagination = false, empty }: {
  items: AuditEntry[]
  isAdmin: boolean
  loading?: boolean
  pagination?: TableProps<AuditEntry>['pagination']
  empty: string
}) {
  return (
    <InventoryTable<AuditEntry> rowKey="id" dataSource={items} loading={loading}
      scroll={{ x: isAdmin ? 630 : 440 }} pagination={pagination}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} /> }}
      columns={[
        { title: 'Action', dataIndex: 'action', width: 144, render: (action: string) => auditActions[action] ?? action },
        { title: 'Object', width: 112, render: (_, entry) => entry.entityType === 'AssetRequest'
          ? <Link to={(isAdmin ? '/admin/requests/' : '/requests/') + entry.entityId}>Request #{entry.entityId}</Link>
          : 'Asset #' + entry.entityId },
        ...(isAdmin ? [{ title: 'Actor', key: 'actor', className: 'audit-actor', render: (_: unknown, entry: AuditEntry) => entry.actor ?? 'Unknown' }] : []),
        { title: 'Timestamp', width: 184, render: (_, entry) => (
          <time dateTime={entry.occurredAtUtc}>{formatDateTime(entry.occurredAtUtc)}</time>
        ) },
      ]} />
  )
}
