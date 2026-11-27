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

export function InventorySkeleton({ label = 'Loading inventory' }: { label?: string }) {
  return <div className="inventory-skeleton" role="status" aria-label={label}><Skeleton active paragraph={{ rows: 5 }} /></div>
}
