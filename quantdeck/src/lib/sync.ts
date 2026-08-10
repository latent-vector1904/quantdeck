/**
 * Sync layer — localStorage first; Upstash only on manual Push / Pull.
 *
 * Keys: "solved" | "saved" | "notes" (namespaced as quantdeck:* in upstash.ts)
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
    const notes: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'updatedAt' || k === 'notes') continue
      if (typeof v === 'string') notes[k] = v
    }
    return { notes, updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : 0 }
  }
  return { notes: {}, updatedAt: 0 }
}

// ── Local-only saves (toggles never touch the cloud) ──────────
export function saveLocalSolved(solved: Set<string>) {
  lsSaveSet(LS.solved, solved)
  lsSetTs(TS.solved, Date.now())
}
export function saveLocalSaved(saved: Set<string>) {
  lsSaveSet(LS.saved, saved)
  lsSetTs(TS.saved, Date.now())
}
export function saveLocalNotes(notes: Record<string, string>) {
  lsSaveObj(LS.notes, notes)
  lsSetTs(TS.notes, Date.now())
}

/** @deprecated use saveLocal* */
export async function pushSolved(solved: Set<string>) { saveLocalSolved(solved) }
export async function pushSaved(saved: Set<string>) { saveLocalSaved(saved) }
export async function pushNotes(notes: Record<string, string>) { saveLocalNotes(notes) }

/** Manual PUSH — overwrite cloud with this browser's progress. */
export async function pushAll(): Promise<{
  solved: number
  saved: number
  notes: number
}> {
  if (!isUpstashEnabled()) throw new Error('Cloud sync is not configured — save Upstash URL + Token first')
  const updatedAt = Date.now()
  const solved = lsGetSet(LS.solved)
  const saved = lsGetSet(LS.saved)
  const notes = lsGetObj(LS.notes)
  lsSetTs(TS.solved, updatedAt)
  lsSetTs(TS.saved, updatedAt)
  lsSetTs(TS.notes, updatedAt)

  const payload = {
    solved: { ids: [...solved], updatedAt },
    saved: { ids: [...saved], updatedAt },
    notes: { notes, updatedAt },
  }

  await Promise.all([
    upstashSet('solved', payload.solved),
    upstashSet('saved', payload.saved),
    upstashSet('notes', payload.notes),
  ])

  // Verify write landed (catches readonly token / wrong DB)
  const [checkSolved, checkSaved] = await Promise.all([
    upstashGet('solved'),
    upstashGet('saved'),
  ])
  const gotSolved = Array.isArray((checkSolved as { ids?: unknown })?.ids)
    ? (checkSolved as { ids: unknown[] }).ids.length
    : -1
  if (gotSolved !== payload.solved.ids.length) {
    throw new Error(
      `Push wrote but readback mismatch (expected ${payload.solved.ids.length} solved, got ${gotSolved}). ` +
      'In Upstash console look for keys quantdeck:solved / quantdeck:saved / quantdeck:notes',
    )
  }
  void checkSaved

  return {
    solved: payload.solved.ids.length,
    saved: payload.saved.ids.length,
    notes: Object.keys(payload.notes.notes).length,
  }
}

/** Manual PULL — overwrite this browser with cloud progress. */
export async function pullAll(): Promise<{
  solved: Set<string>
  saved: Set<string>
  notes: Record<string, string>
}> {
  if (!isUpstashEnabled()) throw new Error('Cloud sync is not configured')

  const [remoteSolvedRaw, remoteSavedRaw, remoteNotesRaw] = await Promise.all([
    upstashGet('solved'),
    upstashGet('saved'),
    upstashGet('notes'),
  ])

  const remoteSolved = parseVersionedSet(remoteSolvedRaw)
  const remoteSaved = parseVersionedSet(remoteSavedRaw)
  const remoteNotes = parseVersionedNotes(remoteNotesRaw)

  const solved = new Set(remoteSolved.ids)
  const saved = new Set(remoteSaved.ids)
  const notes = remoteNotes.notes
  const now = Date.now()

  lsSaveSet(LS.solved, solved)
  lsSaveSet(LS.saved, saved)
  lsSaveObj(LS.notes, notes)
  lsSetTs(TS.solved, remoteSolved.updatedAt || now)
  lsSetTs(TS.saved, remoteSaved.updatedAt || now)
  lsSetTs(TS.notes, remoteNotes.updatedAt || now)

  return { solved, saved, notes }
}

/** Peek remote counts without changing local data. */
export async function peekRemote(): Promise<{ solved: number; saved: number; notes: number } | null> {
  if (!isUpstashEnabled()) return null
  const [a, b, c] = await Promise.all([
    upstashGet('solved'),
    upstashGet('saved'),
    upstashGet('notes'),
  ])
  return {
    solved: parseVersionedSet(a).ids.length,
    saved: parseVersionedSet(b).ids.length,
    notes: Object.keys(parseVersionedNotes(c).notes).length,
  }
}

// ── File backup ───────────────────────────────────────────────
export type ProgressBackup = {
  version: 1
  exportedAt: string
  solved: string[]
  saved: string[]
  notes: Record<string, string>
}

export function exportProgress(): ProgressBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    solved: [...lsGetSet(LS.solved)],
    saved: [...lsGetSet(LS.saved)],
    notes: lsGetObj(LS.notes),
  }
}

export function downloadProgressBackup() {
  const data = exportProgress()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quantdeck-progress-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProgress(raw: unknown): {
  solved: Set<string>
  saved: Set<string>
  notes: Record<string, string>
} {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid progress file')
  const obj = raw as Partial<ProgressBackup>

  const incomingSolved = Array.isArray(obj.solved) ? obj.solved.filter((x): x is string => typeof x === 'string') : []
  const incomingSaved  = Array.isArray(obj.saved)  ? obj.saved.filter((x): x is string => typeof x === 'string') : []
  const incomingNotes  = (obj.notes && typeof obj.notes === 'object' && !Array.isArray(obj.notes))
    ? obj.notes as Record<string, string>
    : {}

  const solved = new Set([...lsGetSet(LS.solved), ...incomingSolved])
  const saved  = new Set([...lsGetSet(LS.saved), ...incomingSaved])
  const notes  = { ...lsGetObj(LS.notes) }
  for (const [id, note] of Object.entries(incomingNotes)) {
    if (typeof note !== 'string') continue
    if (!notes[id] || note.length >= notes[id].length) notes[id] = note
  }

  const now = Date.now()
  lsSaveSet(LS.solved, solved)
  lsSaveSet(LS.saved, saved)
  lsSaveObj(LS.notes, notes)
  lsSetTs(TS.solved, now)
  lsSetTs(TS.saved, now)
  lsSetTs(TS.notes, now)

  return { solved, saved, notes }
}
