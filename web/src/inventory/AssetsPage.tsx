import { InventoryTable } from '../InventoryTable'
import { StatusTag } from '../StatusTag'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Input, Modal, Select, Space } from 'antd'
import type { TableProps } from 'antd'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ApiError } from '../auth/api'
import { assetStatuses, getAssets, getCategories, inventoryKeys, retireAsset, type Asset, type AssetFilters, type InventoryAccess } from './api'
import { AssetEditor } from './AssetEditor'
import { InventoryError, InventorySkeleton } from './InventoryFeedback'
import './inventory.css'

export default function AssetsPage() {
  const { accessToken, isAdmin } = useOutletContext<InventoryAccess>()
  const cache = useQueryClient()
  const [filters, setFilters] = useState<AssetFilters>({ page: 1, pageSize: 10 })
  const [editor, setEditor] = useState<Asset | 'new' | null>(null)
  const [retiring, setRetiring] = useState<Asset | null>(null)
  const assets = useQuery({
    queryKey: [...inventoryKeys.assets, filters],
    queryFn: ({ signal }) => getAssets(accessToken, filters, signal),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const categories = useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: ({ signal }) => getCategories(accessToken, signal),
    retry: false,
  })
  const retire = useMutation({
    mutationFn: (id: number) => retireAsset(accessToken, id),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: inventoryKeys.assets })
      setRetiring(null)
    },
  })
  const updateFilters = (next: Partial<AssetFilters>) => setFilters(current => ({ ...current, ...next, page: 1 }))
  const clear = () => setFilters(current => ({ page: 1, pageSize: current.pageSize }))
  const hasFilters = Boolean(filters.search?.trim() || filters.categoryId || filters.status)

  const columns: TableProps<Asset>['columns'] = [
    { title: 'Asset', dataIndex: 'name', className: 'inventory-name' },
    { title: 'Code', dataIndex: 'assetCode', className: 'inventory-code', width: 152 },
    { title: 'Category', dataIndex: 'categoryName', width: 150 },
    { title: 'Status', dataIndex: 'status', width: 125, render: (_, asset) => {
      const status = assetStatuses.find(item => item.value === asset.status)
      return <StatusTag tone={status?.color} label={status?.label ?? asset.status} />
    } },
  ]
  if (isAdmin) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      width: 145,
      align: 'left',
      render: (_, asset) => (
        <Space size={4}>
          <Button type="link" aria-label={'Edit ' + asset.name} onClick={() => setEditor(asset)}>Edit</Button>
          {asset.status === 'Available' && (
            <Button type="link" danger aria-label={'Retire ' + asset.name} onClick={() => {
              retire.reset()
              setRetiring(asset)
            }}>Retire</Button>
          )}
        </Space>
      ),
    })
  }

  return (
    <main className="workspace-content inventory-page">
      <div className="inventory-heading">
        <h1>Assets</h1>
        {isAdmin && <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} disabled={!categories.data?.length}
          onClick={() => setEditor('new')}>Add Asset</Button>}
      </div>
      <section className="inventory-panel" aria-label="Asset inventory">
        <div className="inventory-filters">
          <Input allowClear aria-label="Search assets" placeholder="Search by name or code"
            value={filters.search ?? ''} maxLength={150} prefix={<SearchOutlined />}
            onChange={event => updateFilters({ search: event.target.value })} />
          <Select allowClear aria-label="Filter by category" placeholder="All categories"
            value={filters.categoryId} loading={categories.isPending}
            options={categories.data?.map(category => ({ label: category.name, value: category.id }))}
            onChange={value => updateFilters({ categoryId: value })} />
          <Select allowClear virtual={false} aria-label="Filter by status" placeholder="All statuses" value={filters.status}
            options={assetStatuses} onChange={value => updateFilters({ status: value })} />
        </div>
        {assets.isError || categories.isError ? (
          <div className="inventory-message">
            <InventoryError onRetry={() => {
              if (assets.isError) void assets.refetch()
              if (categories.isError) void categories.refetch()
            }}>Unable to load inventory.</InventoryError>
          </div>
        ) : assets.isPending ? <InventorySkeleton /> : (
          <InventoryTable<Asset>
            rowKey="id"
            columns={columns}
            dataSource={assets.data.items}
            scroll={{ x: isAdmin ? 680 : 540 }}
            loading={assets.isFetching}
            locale={{ emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasFilters ? 'No matching assets' : 'No assets yet'}>
                {hasFilters && <Button onClick={clear}>Clear filters</Button>}
                {!hasFilters && isAdmin && categories.data?.length === 0 && <Link to="/categories">Add a category first</Link>}
              </Empty>
            ) }}
            pagination={{
              current: assets.isPlaceholderData ? filters.page : assets.data.page,
              pageSize: filters.pageSize,
              pageSizeOptions: [10, 20, 50],
              total: assets.data.total,
              showSizeChanger: true,
              hideOnSinglePage: assets.data.total === 0,
              showTotal: total => total + (total === 1 ? ' asset' : ' assets'),
              onChange: (page, pageSize) => setFilters(current => ({
                ...current, page: pageSize === current.pageSize ? page : 1, pageSize,
              })),
            }}
          />
        )}
      </section>
      {editor && categories.data && <AssetEditor accessToken={accessToken} categories={categories.data}
        asset={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
      {retiring && (
        <Modal
          open
          title="Retire asset?"
          okText="Retire asset"
          okButtonProps={{ danger: true }}
          confirmLoading={retire.isPending}
          onOk={() => retire.mutate(retiring.id)}
          onCancel={() => { if (!retire.isPending) setRetiring(null) }}
        >
          <p>{retiring.name} ({retiring.assetCode}) will stay in the inventory with a Retired status.</p>
          {retire.isError && (
            <Alert type="error" showIcon title={retire.error instanceof ApiError ? retire.error.message : 'Unable to retire the asset.'} />
          )}
        </Modal>
      )}
    </main>
  )
}
