const KEY_PREFIX = 'quantdeck:'

export function getUpstashUrl(): string {
  const custom = localStorage.getItem('qp_upstash_url')
  if (custom?.trim()) return custom.trim()
  const env = import.meta.env.VITE_UPSTASH_REST_URL as string | undefined
  if (env?.trim() && !env.includes('your-')) return env.trim()
  return ''
}

export function getUpstashToken(): string {
  const custom = localStorage.getItem('qp_upstash_token')
  if (custom?.trim()) return custom.trim()
  const env = import.meta.env.VITE_UPSTASH_REST_TOKEN as string | undefined
  if (env?.trim() && !env.includes('your-')) return env.trim()
  return ''
}

export function setUpstashCredentials(url: string, token: string) {
  if (url.trim()) localStorage.setItem('qp_upstash_url', url.trim())
  else localStorage.removeItem('qp_upstash_url')

  if (token.trim()) localStorage.setItem('qp_upstash_token', token.trim())
  else localStorage.removeItem('qp_upstash_token')
}

export function isUpstashEnabled(): boolean {
  return Boolean(getUpstashUrl() && getUpstashToken())
}

function remoteKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`
}

/**
 * GET key from Upstash Redis REST API
 * @see https://upstash.com/docs/redis/features/restapi
 */
export async function upstashGet(key: string): Promise<unknown> {
  const url = getUpstashUrl()
  const token = getUpstashToken()
  if (!url || !token) return null

  const res = await fetch(`${url}/get/${encodeURIComponent(remoteKey(key))}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Upstash GET ${res.status}`)
  }

  const data = await res.json()
  if (data?.result === null || data?.result === undefined) return null

  let val = data.result
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val)
    } catch {
      // keep raw string
    }
  }
  return val
}

/**
 * SET key in Upstash Redis REST API (value as POST body).
 */
export async function upstashSet(key: string, value: unknown): Promise<void> {
  const url = getUpstashUrl()
  const token = getUpstashToken()
  if (!url || !token) return

  const res = await fetch(`${url}/set/${encodeURIComponent(remoteKey(key))}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    // Body is appended as the Redis SET value
    body: JSON.stringify(value),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Upstash SET ${res.status}`)
  }
}
