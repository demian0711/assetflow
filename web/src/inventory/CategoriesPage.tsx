import { InventoryTable } from '../InventoryTable'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Drawer, Empty, Form, Input, Space } from 'antd'
import { useState } from 'react'
import { Navigate, useOutletContext } from 'react-router'
import { ApiError } from '../auth/api'
import { formFieldErrors, getCategories, inventoryKeys, saveCategory, type Category, type InventoryAccess } from './api'
import { InventoryError, InventorySkeleton } from './InventoryFeedback'
import './inventory.css'

function CategoryEditor({ token, category, onClose }: { token: string; category?: Category; onClose: () => void }) {
  const [form] = Form.useForm<{ name: string }>()
  const cache = useQueryClient()
  const save = useMutation({
    mutationFn: ({ name }: { name: string }) => saveCategory(token, name, category?.id),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: inventoryKeys.categories }),
        cache.invalidateQueries({ queryKey: inventoryKeys.assets }),
      ])
      onClose()
    },
    onError: error => {
      const fields = formFieldErrors(error, ['name'])
      form.setFields(fields)
      if (fields.length) form.focusField('name')
    },
  })
  const close = () => { if (!save.isPending) onClose() }

  return (
    <Drawer title={category ? 'Edit category' : 'Add category'} open size="min(416px, 100vw)" onClose={close}
      footer={<Space className="inventory-form-actions">
        <Button onClick={close} disabled={save.isPending}>Cancel</Button>
        <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
          {category ? 'Save changes' : 'Add category'}
        </Button>
      </Space>}>
      <Form form={form} name="category-editor" layout="vertical" initialValues={category}
        disabled={save.isPending} onFinish={values => save.mutate(values)}>
        <Form.Item label="Name" name="name" rules={[
          { required: true, whitespace: true, message: 'Enter a category name.' },
          { max: 100, message: 'Use 100 characters or fewer.' },
        ]}>
          <Input autoFocus maxLength={100} />
        </Form.Item>
        {save.isError && !formFieldErrors(save.error, ['name']).length && (
          <Alert type="error" showIcon title={save.error instanceof ApiError ? save.error.message : 'Unable to save the category.'} />
        )}
      </Form>
    </Drawer>
  )
}

function CategoryList({ accessToken }: { accessToken: string }) {
  const [editor, setEditor] = useState<Category | 'new' | null>(null)
  const categories = useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: ({ signal }) => getCategories(accessToken, signal),
    retry: false,
  })

  return (
    <main className="workspace-content inventory-page">
      <div className="inventory-heading inventory-categories">
        <h1>Categories</h1>
        <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={() => setEditor('new')}>Add Category</Button>
      </div>
      <section className="inventory-panel inventory-categories" aria-label="Equipment categories">
        {categories.isError ? (
          <div className="inventory-message"><InventoryError onRetry={() => void categories.refetch()}>
            Unable to load categories.
          </InventoryError></div>
        ) : categories.isPending ? <InventorySkeleton /> : (
          <InventoryTable<Category>
            rowKey="id"
            dataSource={categories.data}
            loading={categories.isFetching}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No categories yet" /> }}
            pagination={false}
            columns={[
              { title: 'Category', dataIndex: 'name', className: 'inventory-name' },
              { title: 'Actions', align: 'right', width: 112, render: (_, category) => (
                <Button type="link" aria-label={'Edit ' + category.name} onClick={() => setEditor(category)}>Edit</Button>
              ) },
            ]}
          />
        )}
      </section>
      {editor && <CategoryEditor token={accessToken} category={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
    </main>
  )
}

export default function CategoriesPage() {
  const { accessToken, isAdmin } = useOutletContext<InventoryAccess>()
  return isAdmin ? <CategoryList accessToken={accessToken} /> : <Navigate to="/assets" replace />
}
