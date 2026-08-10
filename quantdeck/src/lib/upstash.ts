const KEY_PREFIX = 'quantdeck:'

function normalizeUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '')
  // Common paste mistakes
  u = u.replace(/^['"]|['"]$/g, '')
  if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`
  return u
}

function normalizeToken(raw: string): string {
  return raw.trim().replace(/^['"]|['"]$/g, '')
}

export function getUpstashUrl(): string {
  const custom = localStorage.getItem('qp_upstash_url')
  if (custom?.trim()) return normalizeUrl(custom)
  const env = import.meta.env.VITE_UPSTASH_REST_URL as string | undefined
  if (env?.trim() && !env.includes('your-')) return normalizeUrl(env)
  return ''
}

export function getUpstashToken(): string {
  const custom = localStorage.getItem('qp_upstash_token')
  if (custom?.trim()) return normalizeToken(custom)
  const env = import.meta.env.VITE_UPSTASH_REST_TOKEN as string | undefined
  if (env?.trim() && !env.includes('your-')) return normalizeToken(env)
  return ''
}

export function setUpstashCredentials(url: string, token: string) {
  const u = normalizeUrl(url)
  const t = normalizeToken(token)
  if (u) localStorage.setItem('qp_upstash_url', u)
  else localStorage.removeItem('qp_upstash_url')

  if (t) localStorage.setItem('qp_upstash_token', t)
  else localStorage.removeItem('qp_upstash_token')
}

export function isUpstashEnabled(): boolean {
  return Boolean(getUpstashUrl() && getUpstashToken())
}

export function remoteKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`
}

type UpstashJson = { result?: unknown; error?: string }

async function upstashCommand(args: unknown[]): Promise<unknown> {
  const url = getUpstashUrl()
  const token = getUpstashToken()
  if (!url || !token) throw new Error('Upstash URL/token missing — save credentials in Settings first')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  const text = await res.text().catch(() => '')
  let data: UpstashJson = {}
  try {
    data = text ? JSON.parse(text) as UpstashJson : {}
  } catch {
    if (!res.ok) throw new Error(text || `Upstash HTTP ${res.status}`)
    throw new Error(`Upstash returned non-JSON: ${text.slice(0, 120)}`)
  }

  if (!res.ok || data.error) {
    throw new Error(data.error || text || `Upstash HTTP ${res.status}`)
  }

  return data.result ?? null
}

/**
 * GET key from Upstash Redis REST API
 * @see https://upstash.com/docs/redis/features/restapi
 */
export async function upstashGet(key: string): Promise<unknown> {
  const val = await upstashCommand(['GET', remoteKey(key)])
  if (val === null || val === undefined) return null

  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }
  return val
}

/**
 * SET key in Upstash Redis REST API.
 */
export async function upstashSet(key: string, value: unknown): Promise<void> {
  const result = await upstashCommand(['SET', remoteKey(key), JSON.stringify(value)])
  if (result !== 'OK' && result !== null && result !== undefined) {
    // Redis SET normally returns "OK"; treat anything else as unexpected
    throw new Error(`Upstash SET unexpected result: ${String(result)}`)
  }
}

/** Ping + write/read probe so Settings can verify credentials. */
export async function upstashTestConnection(): Promise<string> {
  const pong = await upstashCommand(['PING'])
  if (pong !== 'PONG') throw new Error(`PING failed: ${String(pong)}`)

  const probeKey = remoteKey('_probe')
  const probeVal = `ok-${Date.now()}`
  await upstashCommand(['SET', probeKey, probeVal, 'EX', 60])
  const got = await upstashCommand(['GET', probeKey])
  if (got !== probeVal) throw new Error('Write probe failed — check you used the write Token, not Readonly')

  return 'Connected — write access OK'
}
