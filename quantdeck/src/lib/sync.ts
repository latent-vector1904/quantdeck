/**
 * Sync layer — Upstash Redis-backed with localStorage fallback.
 *
 * Keys: "solved" | "saved" | "notes" (namespaced as quantdeck:* in upstash.ts)
 *
 * Sets/notes use last-write-wins with updatedAt so unsaving/unsolving sticks.
 * Legacy plain arrays / note objects are still accepted on read.
 */

import { isUpstashEnabled, upstashGet, upstashSet } from './upstash'

const LS = {
  solved: 'qp_solved_v4',
  saved:  'qp_saved_v1',
  notes:  'qp_notes_v1',
}

const TS = {
  solved: 'qp_solved_v4_ts',
  saved:  'qp_saved_v1_ts',
  notes:  'qp_notes_v1_ts',
}

type VersionedSet = { ids: string[]; updatedAt: number }
type VersionedNotes = { notes: Record<string, string>; updatedAt: number }

// ── localStorage helpers ──────────────────────────────────────
export function lsGetSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
export function lsGetObj(key: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
export function lsSaveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]))
}
export function lsSaveObj(key: string, o: Record<string, string>) {
  localStorage.setItem(key, JSON.stringify(o))
}

function lsGetTs(key: string): number {
  const n = Number(localStorage.getItem(key) || 0)
  return Number.isFinite(n) ? n : 0
}
function lsSetTs(key: string, ts: number) {
  localStorage.setItem(key, String(ts))
}

function parseVersionedSet(raw: unknown): VersionedSet {
  if (Array.isArray(raw)) {
    return { ids: raw.filter((x): x is string => typeof x === 'string'), updatedAt: 0 }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as { ids?: unknown; updatedAt?: unknown }
    const ids = Array.isArray(obj.ids) ? obj.ids.filter((x): x is string => typeof x === 'string') : []
    const updatedAt = typeof obj.updatedAt === 'number' ? obj.updatedAt : 0
    return { ids, updatedAt }
  }
  return { ids: [], updatedAt: 0 }
}

function parseVersionedNotes(raw: unknown): VersionedNotes {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as { notes?: unknown; updatedAt?: unknown }
    if (obj.notes && typeof obj.notes === 'object' && !Array.isArray(obj.notes)) {
      return {
        notes: obj.notes as Record<string, string>,
        updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : 0,
      }
    }
    // Legacy: bare notes object
    const notes: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'updatedAt' || k === 'notes') continue
      if (typeof v === 'string') notes[k] = v
    }
    return { notes, updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : 0 }
  }
  return { notes: {}, updatedAt: 0 }
}

function sameIds(a: Set<string>, b: string[]): boolean {
  if (a.size !== b.length) return false
  return b.every(id => a.has(id))
}

function sameNotes(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every(k => a[k] === b[k])
}

async function pushRemote(key: string, value: unknown) {
  if (!isUpstashEnabled()) return
  try {
    await upstashSet(key, value)
  } catch (err) {
    console.warn(`[sync] push ${key} failed:`, err)
  }
}

function resolveSet(
  local: Set<string>,
  localTs: number,
  remote: VersionedSet,
  lsKey: string,
  tsKey: string,
  remoteKey: string,
): { value: Set<string>; changed: boolean; push?: Promise<void> } {
  if (remote.updatedAt > localTs) {
    const next = new Set(remote.ids)
    lsSaveSet(lsKey, next)
    lsSetTs(tsKey, remote.updatedAt)
    return { value: next, changed: !sameIds(local, remote.ids) }
  }

  if (localTs > remote.updatedAt) {
    const updatedAt = localTs
    return {
      value: local,
      changed: false,
      push: upstashSet(remoteKey, { ids: [...local], updatedAt }),
    }
  }

  // Both same generation (incl. legacy 0): one-time union, then stamp so deletes work afterward
  if (!sameIds(local, remote.ids)) {
    const merged = new Set(local)
    remote.ids.forEach(id => merged.add(id))
    const updatedAt = Date.now()
    lsSaveSet(lsKey, merged)
    lsSetTs(tsKey, updatedAt)
    return {
      value: merged,
      changed: !sameIds(local, [...merged]),
      push: upstashSet(remoteKey, { ids: [...merged], updatedAt }),
    }
  }

  return { value: local, changed: false }
}

function resolveNotes(
  local: Record<string, string>,
  localTs: number,
  remote: VersionedNotes,
): { value: Record<string, string>; changed: boolean; push?: Promise<void> } {
  if (remote.updatedAt > localTs) {
    lsSaveObj(LS.notes, remote.notes)
    lsSetTs(TS.notes, remote.updatedAt)
    return { value: remote.notes, changed: !sameNotes(local, remote.notes) }
  }

  if (localTs > remote.updatedAt) {
    return {
      value: local,
      changed: false,
      push: upstashSet('notes', { notes: local, updatedAt: localTs }),
    }
  }

  if (!sameNotes(local, remote.notes)) {
    const merged = { ...remote.notes, ...local }
    // Prefer longer text on conflict during one-time legacy merge
    for (const [id, note] of Object.entries(remote.notes)) {
      if (!merged[id] || note.length > merged[id].length) merged[id] = note
    }
    const updatedAt = Date.now()
    lsSaveObj(LS.notes, merged)
    lsSetTs(TS.notes, updatedAt)
    return {
      value: merged,
      changed: !sameNotes(local, merged),
      push: upstashSet('notes', { notes: merged, updatedAt }),
    }
  }

  return { value: local, changed: false }
}

// ── Push local data up ────────────────────────────────────────
export async function pushSolved(solved: Set<string>) {
  const updatedAt = Date.now()
  lsSaveSet(LS.solved, solved)
  lsSetTs(TS.solved, updatedAt)
  await pushRemote('solved', { ids: [...solved], updatedAt })
}
export async function pushSaved(saved: Set<string>) {
  const updatedAt = Date.now()
  lsSaveSet(LS.saved, saved)
  lsSetTs(TS.saved, updatedAt)
  await pushRemote('saved', { ids: [...saved], updatedAt })
}
export async function pushNotes(notes: Record<string, string>) {
  const updatedAt = Date.now()
  lsSaveObj(LS.notes, notes)
  lsSetTs(TS.notes, updatedAt)
  await pushRemote('notes', { notes, updatedAt })
}

// ── Pull remote and last-write-wins merge ─────────────────────
export async function pullAndMerge(): Promise<{
  solved: Set<string>
  saved: Set<string>
  notes: Record<string, string>
  changed: boolean
}> {
  const localSolved = lsGetSet(LS.solved)
  const localSaved  = lsGetSet(LS.saved)
  const localNotes  = lsGetObj(LS.notes)

  if (!isUpstashEnabled()) {
    return { solved: localSolved, saved: localSaved, notes: localNotes, changed: false }
  }

  const [remoteSolvedRaw, remoteSavedRaw, remoteNotesRaw] = await Promise.all([
    upstashGet('solved'),
    upstashGet('saved'),
    upstashGet('notes'),
  ])

  const solvedRes = resolveSet(localSolved, lsGetTs(TS.solved), parseVersionedSet(remoteSolvedRaw), LS.solved, TS.solved, 'solved')
  const savedRes  = resolveSet(localSaved,  lsGetTs(TS.saved),  parseVersionedSet(remoteSavedRaw),  LS.saved,  TS.saved,  'saved')
  const notesRes  = resolveNotes(localNotes, lsGetTs(TS.notes), parseVersionedNotes(remoteNotesRaw))

  const pushes = [solvedRes.push, savedRes.push, notesRes.push].filter(Boolean) as Promise<void>[]
  if (pushes.length) await Promise.all(pushes)

  return {
    solved: solvedRes.value,
    saved: savedRes.value,
    notes: notesRes.value,
    changed: solvedRes.changed || savedRes.changed || notesRes.changed,
  }
}
