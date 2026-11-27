import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const destination = new URL('../.env', import.meta.url)
const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
const content = template
  .replaceAll('\r\n', '\n')
  .replace('GENERATE_POSTGRES_PASSWORD', randomBytes(24).toString('hex'))
  .replace('GENERATE_DEMO_PASSWORD', `Af!9${randomBytes(24).toString('hex')}`)

try {
  await writeFile(destination, content, { flag: 'wx', mode: 0o600 })
  console.log('Created .env from .env.example.')
} catch (error) {
  if (error.code !== 'EEXIST') throw error
  console.log('.env already exists and was left unchanged.')
}
