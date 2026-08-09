import { create } from 'zustand'
import type { Problem, StatusFilter, TabId, SyncStatus } from '../types'
import { applyFilters } from '../lib/problems'
import { pushSolved, pushSaved, pushNotes, lsGetSet, lsGetObj } from '../lib/sync'

const PAGE_SIZE = 20

interface Store {
  // ── Problems ──────────────────────────────────────────────
  allProblems: Problem[]
  filtered: Problem[]
  current: Problem | null
  curPage: number
  setAllProblems: (p: Problem[]) => void
  openProblem: (p: Problem) => void
  closeProblem: () => void
  navigate: (dir: 1 | -1) => void

  // ── Filters ───────────────────────────────────────────────
  search: string
  topic: string
  level: string
  statusFilter: StatusFilter
  setSearch: (v: string) => void
  setTopic: (v: string) => void
  setLevel: (v: string) => void
  setStatus: (v: StatusFilter) => void

  // ── User data (synced) ────────────────────────────────────
  solved: Set<string>
  saved: Set<string>
  notes: Record<string, string>
  setSolved: (s: Set<string>) => void
  setSaved: (s: Set<string>) => void
  setNotes: (n: Record<string, string>) => void
  toggleSolved: (id: string) => void
  toggleSaved: (id: string) => void
  updateNote: (id: string, text: string) => void

  // ── UI state ──────────────────────────────────────────────
  curTab: TabId
  notesOpen: boolean
  settingsOpen: boolean
  setCurTab: (t: TabId) => void
  setNotesOpen: (v: boolean) => void
  toggleSettings: () => void

  // ── Sync status ───────────────────────────────────────────
  syncStatus: SyncStatus
  syncError: string | null
  setSyncStatus: (s: SyncStatus, err?: string | null) => void

  // ── Internal ──────────────────────────────────────────────
  _refilter: () => void
}

export const useStore = create<Store>((set, get) => ({
  // ── Problems ──────────────────────────────────────────────
  allProblems: [],
  filtered: [],
  current: null,
  curPage: 1,

  setAllProblems: (p) => {
    set({ allProblems: p })
    get()._refilter()
  },

  openProblem: (p) => set({ current: p, curTab: 'problem' }),
  closeProblem: () => set({ current: null }),

  navigate: (dir) => {
    const { filtered, current } = get()
    if (!current) return
    const idx = filtered.findIndex(p => p._id === current._id)
    const next = filtered[idx + dir]
    if (next) set({ current: next, curTab: 'problem' })
  },

  // ── Filters ───────────────────────────────────────────────
  search: '',
  topic: '',
  level: '',
  statusFilter: 'all',

  setSearch: (v) => { set({ search: v, curPage: 1 }); get()._refilter() },
  setTopic:  (v) => { set({ topic: v, curPage: 1 });  get()._refilter() },
  setLevel:  (v) => { set({ level: v, curPage: 1 });  get()._refilter() },
  setStatus: (v) => { set({ statusFilter: v, curPage: 1 }); get()._refilter() },

  // ── User data (synced) ────────────────────────────────────
  solved: lsGetSet('qp_solved_v4'),
  saved:  lsGetSet('qp_saved_v1'),
  notes:  lsGetObj('qp_notes_v1'),

  setSolved: (s) => { set({ solved: s }); get()._refilter() },
  setSaved:  (s) => { set({ saved: s });  get()._refilter() },
  setNotes:  (n) => set({ notes: n }),

  toggleSolved: (id) => {
    const s = new Set(get().solved)
    if (s.has(id)) s.delete(id); else s.add(id)
    set({ solved: s })
    pushSolved(s)
    get()._refilter()
  },

  toggleSaved: (id) => {
    const s = new Set(get().saved)
    if (s.has(id)) s.delete(id); else s.add(id)
    set({ saved: s })
    pushSaved(s)
    get()._refilter()
  },

  updateNote: (id, text) => {
    const n = { ...get().notes }
    if (text.trim()) n[id] = text; else delete n[id]
    set({ notes: n })
    pushNotes(n)
  },

  // ── UI state ──────────────────────────────────────────────
  curTab: 'problem',
  notesOpen: false,
  settingsOpen: false,

  setCurTab:      (t) => set({ curTab: t }),
  setNotesOpen:   (v) => set({ notesOpen: v }),
  toggleSettings: ()  => set(s => ({ settingsOpen: !s.settingsOpen })),

  // ── Sync status ───────────────────────────────────────────
  syncStatus: 'idle',
  syncError: null,
  setSyncStatus: (s, err = null) => set({ syncStatus: s, syncError: err }),

  // ── Internal ──────────────────────────────────────────────
  _refilter: () => {
    const { allProblems, search, topic, level, statusFilter, solved, saved } = get()
    const filtered = applyFilters(allProblems, { q: search, topic, level, status: statusFilter, solved, saved })
    set({ filtered })
  },
}))

// Pagination helpers (not in store — derived)
export function getPage(filtered: Problem[], page: number) {
  return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}
export function totalPages(filtered: Problem[]) {
  return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
}
export { PAGE_SIZE }
