import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const baseUrl = process.env.ASSETFLOW_TEST_API_URL ?? 'http://localhost:5080'
const password = process.env.DemoSeed__Password
assert.ok(password, 'Load the demo password with node --env-file=.env.')

function request(path, token, body) {
  return fetch(baseUrl + '/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { ...(token && { Authorization: 'Bearer ' + token }),
      ...(body && { 'Content-Type': 'application/json' }) },
    body: body ? JSON.stringify(body) : undefined,
  })
}
async function login(name) {
  const response = await request('auth/login', null, { email: name + '@assetflow.test', password })
  assert.equal(response.status, 200)
  return (await response.json()).accessToken
}
async function read(path, token) {
  const response = await request(path, token)
  assert.equal(response.status, 200)
  return response.json()
}
const asMetrics = dto => Object.fromEntries(dto.metrics.map(item => [item.key, item.count]))

test('reports show PostgreSQL counts, scope employee activity, and redact request content from audit', async () => {
  const [admin, first, second] = await Promise.all([login('admin'), login('employee1'), login('employee2')])
  const [category] = await read('categories', first)
  const before = asMetrics(await read('dashboard', first))
  const privatePurpose = 'Internal request field ' + randomUUID()
  const firstResponse = await request('requests', first, { categoryId: category.id, purpose: privatePurpose })
  const secondResponse = await request('requests', second, { categoryId: category.id, purpose: privatePurpose })
  assert.equal(firstResponse.status, 201)
  assert.equal(secondResponse.status, 201)
  const firstId = String((await firstResponse.json()).request.id)
  const secondId = String((await secondResponse.json()).request.id)
  const dashboard = await read('dashboard', first)
  assert.equal(asMetrics(dashboard).myRequests, before.myRequests + 1)
  assert.equal(asMetrics(dashboard).pendingRequests, before.pendingRequests + 1)
  assert.equal(asMetrics(dashboard).totalAssets, undefined)
  assert.deepEqual(dashboard.categories, [])
  assert.ok(dashboard.activity.some(item => item.entityId === firstId))
  assert.ok(dashboard.activity.every(item => item.entityId !== secondId && item.actor === null))
  assert.equal((await request('admin/audit', first)).status, 403)

  const overview = await read('dashboard', admin)
  const [all, available, inUse, pending] = await Promise.all([
    read('assets', admin), read('assets?status=Available', admin),
    read('assets?status=InUse', admin), read('admin/requests?status=Pending', admin),
  ])
  assert.deepEqual(asMetrics(overview), {
    totalAssets: all.total, available: available.total, inUse: inUse.total, pendingRequests: pending.length,
  })
  assert.equal(overview.categories.reduce((sum, group) => sum + group.count, 0), all.total)
  assert.ok(overview.activity.some(item => item.entityType === 'AssetRequest' && item.entityId === secondId))

  const filters = 'admin/audit?actor=employee1&action=RequestCreated&entityType=AssetRequest&pageSize=1'
  const page = await read(filters, admin)
  assert.equal(page.items.length, 1)
  assert.equal(page.items[0].entityId, firstId)
  assert.equal(page.items[0].actor, 'employee1@assetflow.test')
  assert.deepEqual(Object.keys(page.items[0]).sort(), ['action', 'actor', 'entityId', 'entityType', 'id', 'occurredAtUtc'])
  assert.ok(!JSON.stringify({ page, overview, dashboard }).includes(privatePurpose))
  assert.equal((await request('admin/audit?pageSize=0', admin)).status, 400)
  assert.equal((await request('admin/audit', null)).status, 401)
  if (page.total > 1) {
    const next = await read(filters + '&page=2', admin)
    assert.equal(next.page, 2)
    assert.notEqual(next.items[0].id, page.items[0].id)
  }
})
