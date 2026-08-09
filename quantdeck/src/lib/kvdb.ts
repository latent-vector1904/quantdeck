const bucketId = import.meta.env.VITE_KVDB_BUCKET_ID as string | undefined;
const writeKey = import.meta.env.VITE_KVDB_WRITE_KEY as string | undefined;

export const isKvdbEnabled = !!bucketId && !bucketId.includes('your-bucket-id');

export async function kvGet(key: string): Promise<unknown> {
  if (!isKvdbEnabled) return null;
  try {
    const res = await fetch(`https://kvdb.io/${bucketId}/${key}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`KVDB GET error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('KVDB GET Failed', err);
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (!isKvdbEnabled) return;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (writeKey) {
      headers['Authorization'] = `Bearer ${writeKey}`;
    }
    const res = await fetch(`https://kvdb.io/${bucketId}/${key}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(value)
    });
    if (!res.ok) {
      throw new Error(`KVDB SET error: ${res.status}`);
    }
  } catch (err) {
    console.error('KVDB SET Failed', err);
  }
}
