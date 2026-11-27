import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd'
import { ApiError } from '../auth/api'
import { formFieldErrors, inventoryKeys, saveAsset, type Asset, type AssetInput, type Category } from './api'

export function AssetEditor({ accessToken, asset, categories, onClose }: {
  accessToken: string
  asset?: Asset
  categories: Category[]
  onClose: () => void
}) {
  const [form] = Form.useForm<AssetInput>()
  const cache = useQueryClient()
  const save = useMutation({
    mutationFn: (values: AssetInput) => saveAsset(accessToken, values, asset?.id),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: inventoryKeys.assets })
      onClose()
    },
    onError: error => {
      const fields = formFieldErrors(error, ['assetCode', 'name', 'categoryId'])
      form.setFields(fields)
      if (fields[0]) form.focusField(fields[0].name)
    },
  })
  const formError = save.isError && !formFieldErrors(save.error, ['assetCode', 'name', 'categoryId']).length
  const close = () => { if (!save.isPending) onClose() }

  return (
    <Drawer
      title={asset ? 'Edit asset' : 'Add asset'}
      size="min(416px, 100vw)"
      open
      onClose={close}
      footer={(
        <Space className="inventory-form-actions">
          <Button onClick={close} disabled={save.isPending}>Cancel</Button>
          <Button type="primary" loading={save.isPending} onClick={() => form.submit()}>
            {asset ? 'Save changes' : 'Add asset'}
          </Button>
        </Space>
      )}
    >
      <Form
        name="asset-editor"
        form={form}
        layout="vertical"
        initialValues={asset}
        disabled={save.isPending}
        onFinish={values => save.mutate(values)}
      >
        <Form.Item label="Asset code" name="assetCode" rules={[
          { required: true, whitespace: true, message: 'Enter an asset code.' },
          { max: 50, message: 'Use 50 characters or fewer.' },
        ]}>
          <Input autoFocus maxLength={50} />
        </Form.Item>
        <Form.Item label="Name" name="name" rules={[
          { required: true, whitespace: true, message: 'Enter an asset name.' },
          { max: 150, message: 'Use 150 characters or fewer.' },
        ]}>
          <Input maxLength={150} />
        </Form.Item>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true, message: 'Choose a category.' }]}
          extra={asset?.status === 'InUse' ? 'An in-use asset keeps its current category.' : undefined}>
          <Select
            aria-label="Category"
            placeholder="Choose a category"
            disabled={asset?.status === 'InUse' || save.isPending}
            options={categories.map(category => ({ label: category.name, value: category.id }))}
          />
        </Form.Item>
        {formError && <Alert type="error" showIcon title={save.error instanceof ApiError ? save.error.message : 'Unable to save the asset.'} />}
      </Form>
    </Drawer>
  )
}
