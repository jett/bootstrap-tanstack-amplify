// Runtime env validation, called inside server function handlers.
// Never call at module top-level — that would fire at import/SSR time and throw
// before a request even arrives.

export interface AppEnv {
  apiBaseUrl: string
  apiKey: string
  // Add fields as needed.
}

export function appEnv(): AppEnv {
  return {
    apiBaseUrl: required('APP_API_BASE_URL').replace(/\/$/, ''),
    apiKey: required('APP_API_KEY'),
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}
