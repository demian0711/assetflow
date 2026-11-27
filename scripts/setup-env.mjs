import { randomBytes } from 'node:crypto'
import { appendFile, readFile, writeFile } from 'node:fs/promises'

const destination = new URL('../.env', import.meta.url)
const template = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
const jwtKey = randomBytes(32).toString('hex')
const content = template
  .replaceAll('\r\n', '\n')
  .replace('GENERATE_POSTGRES_PASSWORD', randomBytes(24).toString('hex'))
  .replace('GENERATE_DEMO_PASSWORD', 'Af!9' + randomBytes(24).toString('hex'))
  .replace('GENERATE_JWT_SIGNING_KEY', jwtKey)

try {
  await writeFile(destination, content, { flag: 'wx', mode: 0o600 })
  console.log('Created .env from .env.example.')
} catch (error) {
  if (error.code !== 'EEXIST') throw error

  const existing = await readFile(destination, 'utf8')
  if (process.argv.includes('--add-jwt-key') && !/^[ \t]*(?:export[ \t]+)?Jwt__SigningKey=/m.test(existing)) {
    const newline = existing.length && !existing.endsWith('\n') ? '\n' : ''
    await appendFile(destination, newline + 'Jwt__SigningKey=' + jwtKey + '\n')
    console.log('Added a JWT signing key to .env.')
  } else {
    console.log('.env already exists and was left unchanged.')
  }
}
