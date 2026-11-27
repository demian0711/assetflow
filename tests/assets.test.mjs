import assert from 'node:assert/strict'
import { test } from 'node:test'

const baseUrl = process.env.ASSETFLOW_TEST_API_URL ?? 'http://localhost:5080'
const password = process.env.DemoSeed__Password
assert.ok(password, 'Load the demo password with node --env-file=.env.')

function request(path, { token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (body) headers['Content-Type'] = 'application/json'
  return fetch(baseUrl + '/api/' + path, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

async function login(email) {
  const response = await request('auth/login', { body: { email, password } })
  assert.equal(response.status, 200, 'Start the API with demo seed enabled for ' + email)
  return (await response.json()).accessToken
}

async function seededAsset(token) {
  const response = await request('assets?search=DEMO-LAP-001', { token })
  assert.equal(response.status, 200)
  const { items } = await response.json()
  const existing = items.find(asset => asset.assetCode === 'DEMO-LAP-001')
  assert.ok(existing, 'Expected demo asset DEMO-LAP-001.')
  return { assetCode: existing.assetCode, name: existing.name, categoryId: existing.categoryId }
}

test('Admin receives 409 and a field error for a duplicate asset code', async () => {
  const token = await login('admin@assetflow.test')
  const existing = await seededAsset(token)
  const response = await request('assets', {
    token,
    body: { ...existing, assetCode: existing.assetCode.toLowerCase() },
  })
  assert.equal(response.status, 409)
  assert.match(response.headers.get('content-type'), /^application\/problem\+json/)
  assert.ok((await response.json()).errors.assetCode.length)
})

test('Employee can list assets but receives 403 when creating one', async () => {
  const token = await login('employee1@assetflow.test')
  const existing = await seededAsset(token)
  const response = await request('assets', { token, body: existing })
  assert.equal(response.status, 403)
  assert.match(response.headers.get('content-type'), /^application\/problem\+json/)
})
