import { Alert, Button, Skeleton } from 'antd'

export function InventoryError({ children, onRetry }: { children: string; onRetry: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      title={children}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  )
}

export function InventorySkeleton() {
  return <div className="inventory-skeleton" role="status" aria-label="Loading inventory"><Skeleton active paragraph={{ rows: 5 }} /></div>
}
