import { readFileSync, writeFileSync } from 'node:fs'

// EDIT PER PROJECT: list the env vars your SSR Lambda needs at runtime.
// Must match the values set in Amplify Console → Hosting → Environment variables,
// and the keys read by src/server/env.ts.
const FORWARDED = [
  'APP_API_BASE_URL',
  'APP_API_KEY',
  // Add more as needed.
]

const ENTRY = '.amplify-hosting/compute/default/server.js'

const values = {}
for (const name of FORWARDED) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing env var ${name} in build shell — set it in Amplify Console → Hosting → Environment variables`,
    )
  }
  values[name] = value
}

const original = readFileSync(ENTRY, 'utf8')
const preamble = FORWARDED.map(
  (name) => `process.env[${JSON.stringify(name)}] = ${JSON.stringify(values[name])}`,
).join('\n')
writeFileSync(ENTRY, `${preamble}\n${original}`)

console.log(`Injected ${FORWARDED.length} env vars into ${ENTRY}`)
