export interface Company {
  name: string
  logoURL: string
}

export interface Problem {
  _id: string
  order: number
  title: string
  level: string
  topic: string
  type: string
  isPrivate?: boolean
  askedIn?: Company[]
  question?: string
  answer?: string
  hint1?: string
  hint2?: string
  hint3?: string
  hint4?: string
  hint5?: string
  solution?: string
  solution2?: string
  solution3?: string
  normalisedTitle?: string
  normalizedTitle?: string
  courseId?: string
  chapterId?: string
}

export type StatusFilter = 'all' | 'saved' | 'unsolved'
export type TabId = 'problem' | 'solution'
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

export interface SyncData {
  solved: string[]
  saved: string[]
  notes: Record<string, string>
}
