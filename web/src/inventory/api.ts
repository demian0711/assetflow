import { ApiError, authorizedRequest } from '../auth/api'

export type AssetStatus = 'Available' | 'InUse' | 'Retired'
export type Category = { id: number; name: string }
export type AssetInput = { assetCode: string; name: string; categoryId: number }
export type Asset = AssetInput & { id: number; categoryName: string; status: AssetStatus }
export type AssetFilters = {
  search?: string
  categoryId?: number
  status?: AssetStatus
  page: number
  pageSize: number
}
export type InventoryAccess = { accessToken: string; isAdmin: boolean }

type AssetPage = { items: Asset[]; total: number; page: number; pageSize: number }

export const assetStatuses: { value: AssetStatus; label: string; color: string }[] = [
  { value: 'Available', label: 'Available', color: 'green' },
  { value: 'InUse', label: 'In use', color: 'blue' },
  { value: 'Retired', label: 'Retired', color: 'default' },
]

export const inventoryKeys = { assets: ['assets'], categories: ['categories'] }

export function getCategories(token: string, signal: AbortSignal) {
  return authorizedRequest<Category[]>(token, '/api/categories', { signal })
}

export function getAssets(token: string, filters: AssetFilters, signal: AbortSignal) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  const search = filters.search?.trim()
  if (search) params.set('search', search)
  if (filters.categoryId) params.set('categoryId', String(filters.categoryId))
  if (filters.status) params.set('status', filters.status)
  return authorizedRequest<AssetPage>(token, '/api/assets?' + params.toString(), { signal })
}

export function saveAsset(token: string, input: AssetInput, id?: number) {
  return authorizedRequest<Asset>(token, id ? '/api/assets/' + id : '/api/assets', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function retireAsset(token: string, id: number) {
  return authorizedRequest<Asset>(token, '/api/assets/' + id + '/retire', { method: 'POST' })
}

export function saveCategory(token: string, name: string, id?: number) {
  return authorizedRequest<Category>(token, id ? '/api/categories/' + id : '/api/categories', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function formFieldErrors<T extends string>(error: unknown, names: readonly T[]) {
  if (!(error instanceof ApiError) || !error.fieldErrors) return []
  return Object.entries(error.fieldErrors).flatMap(([key, errors]) => {
    const name = names.find(field => field.toLowerCase() === key.toLowerCase())
    return name ? [{ name, errors }] : []
  })
}
