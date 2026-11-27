import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { useRef } from 'react'
import { ApiError } from '../auth/api'
import { formFieldErrors, getCategories, inventoryKeys } from '../inventory/api'
import { InventoryError } from '../inventory/InventoryFeedback'
import { createRequest, type NewRequest, type RequestDetail } from './api'

const fieldNames = ['categoryId', 'purpose'] as const

export function NewRequestDrawer({ token, onClose, onCreated }: {
  token: string
  onClose: () => void
  onCreated: (detail: RequestDetail) => void
}) {
  const [form] = Form.useForm<NewRequest>()
  const submitting = useRef(false)
  const categories = useQuery({
    queryKey: inventoryKeys.categories,
    queryFn: ({ signal }) => getCategories(token, signal),
    retry: false,
  })
  const create = useMutation({
    mutationFn: (values: NewRequest) => createRequest(token, values),
    onSuccess: onCreated,
    onError: error => {
      const fields = formFieldErrors(error, fieldNames)
      form.setFields(fields)
    },
    onSettled: () => { submitting.current = false },
  })
  const close = () => { if (!submitting.current) onClose() }
  const categoriesAvailable = !categories.isError && Boolean(categories.data?.length)

  return (
    <Drawer title="New Request" open size="min(416px, 100vw)" onClose={close}
      footer={<Space className="inventory-form-actions">
        <Button onClick={close} disabled={create.isPending}>Close</Button>
        <Button type="primary" loading={create.isPending} disabled={create.isPending || !categoriesAvailable}
          onClick={() => form.submit()}>Submit Request</Button>
      </Space>}>
      {categories.isError && (
        <InventoryError onRetry={() => void categories.refetch()}>Unable to load categories.</InventoryError>
      )}
      {categories.isSuccess && categories.data.length === 0 && (
        <Alert showIcon type="info" title="No equipment categories are available." />
      )}
      <Form form={form} layout="vertical" name="new-request" disabled={create.isPending}
        onFinish={values => {
          if (submitting.current || !categoriesAvailable) return
          submitting.current = true
          create.mutate({ ...values, purpose: values.purpose.trim() })
        }}>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true, message: 'Choose a category.' }]}>
          <Select aria-label="Category" placeholder="Choose a category" loading={categories.isPending}
            options={categories.data?.map(category => ({ value: category.id, label: category.name }))} />
        </Form.Item>
        <Form.Item label="Purpose" name="purpose" rules={[
          { required: true, whitespace: true, message: 'Enter a purpose.' },
          { max: 500, message: 'Use 500 characters or fewer.' },
        ]}>
          <Input.TextArea rows={5} maxLength={500} showCount />
        </Form.Item>
        {create.isError && !formFieldErrors(create.error, fieldNames).length && (
          <Alert showIcon type="error" title={create.error instanceof ApiError ? create.error.message : 'Unable to submit the request.'} />
        )}
      </Form>
    </Drawer>
  )
}
