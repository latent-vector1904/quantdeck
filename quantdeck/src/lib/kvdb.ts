const DEFAULT_BUCKET = '6Vq1F1fn5QXKjGKf1k7ouj';

export function getBucketId(): string {
  const custom = localStorage.getItem('qp_kvdb_bucket_id');
  if (custom && custom.trim()) return custom.trim();
  const env = import.meta.env.VITE_KVDB_BUCKET_ID as string | undefined;
  if (env && env.trim() && !env.includes('your-bucket-id')) return env.trim();
  return DEFAULT_BUCKET;
}

export function setCustomBucketId(id: string) {
  if (id.trim()) {
    localStorage.setItem('qp_kvdb_bucket_id', id.trim());
  } else {
    localStorage.removeItem('qp_kvdb_bucket_id');
  }
}

export const isKvdbEnabled = true;

function getBaseUrl(): string {
  return `https://kvdb.io/${getBucketId()}`;
}

export async function kvGet(key: string): Promise<unknown> {
  try {
    const res = await fetch(`${getBaseUrl()}/${key}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `KVDB GET ${res.status}`);
    }
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn('[kvdb] GET failed:', err);
    throw err;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const writeKey = import.meta.env.VITE_KVDB_WRITE_KEY as string | undefined;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
    };
    if (writeKey) headers['Authorization'] = `Bearer ${writeKey}`;

    const res = await fetch(`${getBaseUrl()}/${key}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(value),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `KVDB SET ${res.status}`);
    }
  } catch (err) {
    console.warn('[kvdb] SET failed:', err);
    throw err;
  }
}
