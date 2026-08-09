/**
 * Sync layer — Upstash Redis-backed with localStorage fallback.
 *
 * Three keys are stored:  "solved" | "saved" | "notes"
 * (namespaced as quantdeck:* inside upstash.ts)
 */

import { isUpstashEnabled, upstashGet, upstashSet } from './upstash'

const LS = {
  solved: 'qp_solved_v4',
  saved:  'qp_saved_v1',
  notes:  'qp_notes_v1',
}

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

async function pushRemote(key: string, value: unknown) {
  if (!isUpstashEnabled()) return
  try {
    await upstashSet(key, value)
  } catch (err) {
    console.warn(`[sync] push ${key} failed:`, err)
  }
}

// ── Push local data up ────────────────────────────────────────
export async function pushSolved(solved: Set<string>) {
  lsSaveSet(LS.solved, solved)
  await pushRemote('solved', [...solved])
}
export async function pushSaved(saved: Set<string>) {
  lsSaveSet(LS.saved, saved)
  await pushRemote('saved', [...saved])
}
export async function pushNotes(notes: Record<string, string>) {
  lsSaveObj(LS.notes, notes)
  await pushRemote('notes', notes)
}

// ── Pull all remote data and merge with local ─────────────────
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

  const remoteSolved = Array.isArray(remoteSolvedRaw) ? remoteSolvedRaw as string[] : []
  const remoteSaved  = Array.isArray(remoteSavedRaw)  ? remoteSavedRaw  as string[] : []
  const remoteNotes  = (remoteNotesRaw && typeof remoteNotesRaw === 'object' && !Array.isArray(remoteNotesRaw))
    ? remoteNotesRaw as Record<string, string>
    : {}

  // Union merge for sets
  let changed = false
  const mergedSolved = new Set(localSolved)
  remoteSolved.forEach(id => { if (!mergedSolved.has(id)) { mergedSolved.add(id); changed = true } })

  const mergedSaved = new Set(localSaved)
  remoteSaved.forEach(id => { if (!mergedSaved.has(id)) { mergedSaved.add(id); changed = true } })

  // Notes: longer note wins
  const mergedNotes = { ...localNotes }
  for (const [id, note] of Object.entries(remoteNotes)) {
    if (!mergedNotes[id] || note.length > mergedNotes[id].length) {
      mergedNotes[id] = note
      changed = true
    }
  }

  // Save merged back locally
  lsSaveSet(LS.solved, mergedSolved)
  lsSaveSet(LS.saved,  mergedSaved)
  lsSaveObj(LS.notes,  mergedNotes)

  // Push merged set back if local had extra items
  const needsPushSolved = [...mergedSolved].some(id => !remoteSolved.includes(id))
  const needsPushSaved  = [...mergedSaved].some(id  => !remoteSaved.includes(id))
  const needsPushNotes  = Object.keys(mergedNotes).some(id =>
    !remoteNotes[id] || mergedNotes[id] !== remoteNotes[id]
  )

  await Promise.all([
    needsPushSolved ? upstashSet('solved', [...mergedSolved]) : Promise.resolve(),
    needsPushSaved  ? upstashSet('saved',  [...mergedSaved])  : Promise.resolve(),
    needsPushNotes  ? upstashSet('notes',  mergedNotes)       : Promise.resolve(),
  ])

  return { solved: mergedSolved, saved: mergedSaved, notes: mergedNotes, changed }
}
