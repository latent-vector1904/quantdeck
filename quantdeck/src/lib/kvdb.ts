const bucketId = import.meta.env.VITE_KVDB_BUCKET_ID as string | undefined;
const writeKey = import.meta.env.VITE_KVDB_WRITE_KEY as string | undefined;

export const isKvdbEnabled = !!bucketId && !bucketId.includes('your-bucket-id');

const BASE = `https://kvdb.io/${bucketId}`;

/**
 * GET a key from KVDB. Returns parsed JSON value or null.
 * Uses no special headers so CORS preflight is never triggered.
 */
export async function kvGet(key: string): Promise<unknown> {
  if (!isKvdbEnabled) return null;
  try {
    const res = await fetch(`${BASE}/${key}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`KVDB GET ${res.status}`);
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn('[kvdb] GET failed:', err);
    return null;
  }
}

/**
 * SET a key in KVDB. Serialises value to JSON text.
 * Sends as text/plain to avoid a CORS preflight on public buckets.
 */
export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!isKvdbEnabled) return;
  try {
    const headers: Record<string, string> = {
      // text/plain → simple request → no CORS preflight needed
      'Content-Type': 'text/plain',
    };
    if (writeKey) headers['Authorization'] = `Bearer ${writeKey}`;

    const res = await fetch(`${BASE}/${key}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error(`KVDB SET ${res.status}`);
  } catch (err) {
    console.warn('[kvdb] SET failed:', err);
  }
}
