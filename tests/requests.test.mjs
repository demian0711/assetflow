import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const baseUrl = process.env.ASSETFLOW_TEST_API_URL ?? 'http://localhost:5080'
const password = process.env.DemoSeed__Password
assert.ok(password, 'Load the demo password with node --env-file=.env.')

async function request(path, { token, method = 'GET', body } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (body) headers['Content-Type'] = 'application/json'
  return fetch(baseUrl + '/api/' + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
}

async function employee(number) {
  const response = await request('auth/login', {
    method: 'POST', body: { email: 'employee' + number + '@assetflow.test', password },
  })
  assert.equal(response.status, 200)
  return (await response.json()).accessToken
}

async function categoryId(token) {
  const response = await request('categories', { token })
  assert.equal(response.status, 200)
  const [category] = await response.json()
  assert.ok(category, 'Run with demo seed enabled.')
  return category.id
}

test('creation uses the authenticated owner and hides the request from another employee', async () => {
  const [owner, other] = await Promise.all([employee(1), employee(2)])
  const profile = await request('auth/me', { token: other })
  assert.equal(profile.status, 200)
  const purpose = randomUUID().padEnd(500, 'x')
  const created = await request('requests', {
    token: owner, method: 'POST',
    body: { categoryId: await categoryId(owner), purpose, employeeId: (await profile.json()).id },
  })
  assert.equal(created.status, 201)
  const detail = await created.json()
  const id = detail.request.id
  assert.equal(detail.request.status, 'Pending')
  assert.equal(detail.request.purpose, purpose)
  assert.deepEqual(detail.timeline.map(event => event.action), ['RequestCreated'])
  assert.equal(created.headers.get('location')?.endsWith('/api/requests/' + id), true)

  const ownerList = await request('requests?status=Pending', { token: owner })
  assert.equal(ownerList.status, 200)
  assert.ok((await ownerList.json()).some(row => row.id === id))
  const otherList = await request('requests', { token: other })
  assert.equal(otherList.status, 200)
  assert.ok(!(await otherList.json()).some(row => row.id === id))
  assert.equal((await request('requests/' + id, { token: other })).status, 404)
  assert.equal((await request('requests/' + id + '/cancel', { token: other, method: 'POST' })).status, 404)

  const attempts = await Promise.all([1, 2].map(() =>
    request('requests/' + id + '/cancel', { token: owner, method: 'POST' })))
  assert.deepEqual(attempts.map(response => response.status).sort(), [200, 409])
  assert.equal((await request('requests/' + id + '/cancel', { token: owner, method: 'POST' })).status, 409)

  const result = await request('requests/' + id, { token: owner })
  assert.equal(result.status, 200)
  const cancelled = await result.json()
  assert.equal(cancelled.request.status, 'Cancelled')
  assert.deepEqual(cancelled.timeline.map(event => event.action), ['RequestCreated', 'RequestCancelled'])
  assert.ok(Date.parse(cancelled.timeline[1].occurredAtUtc) >= Date.parse(cancelled.timeline[0].occurredAtUtc))
})

test('invalid purpose is rejected without creating a request', async () => {
  const token = await employee(1)
  const category = await categoryId(token)
  const before = await request('requests', { token })
  assert.equal(before.status, 200)
  const count = (await before.json()).length
  for (const purpose of ['', '   ', 'x'.repeat(501)]) {
    const response = await request('requests', { token, method: 'POST', body: { categoryId: category, purpose } })
    assert.equal(response.status, 400)
    assert.ok(Object.keys((await response.json()).errors).some(field => field.toLowerCase() === 'purpose'))
  }
  const after = await request('requests', { token })
  assert.equal(after.status, 200)
  assert.equal((await after.json()).length, count)
})
