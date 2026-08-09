import type { Problem } from '../types'

const OVERRIDE_KEY = 'qp_problems_override'

function slim(p: Problem): Problem {
  const KEEP = new Set([
    '_id','title','level','topic','askedIn','type','isPrivate',
    'question','answer','hint1','hint2','hint3','hint4','hint5',
    'solution','solution2','solution3','courseId','chapterId','order',
    'normalisedTitle','normalizedTitle',
  ])
  return Object.fromEntries(
    Object.entries(p).filter(([k]) => KEEP.has(k))
  ) as Problem
}

export async function loadProblems(base: string): Promise<Problem[]> {
  // Check for locally-overridden problems (uploaded via settings)
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (raw) {
      const { problems } = JSON.parse(raw) as { problems: Problem[] }
      if (Array.isArray(problems) && problems.length > 0) {
        return sortProblems(problems)
      }
    }
  } catch { /* ignore */ }

  // Fetch bundled problems.json
  const r = await fetch(`${base}problems.json`)
  const json = await r.json() as { problems?: Problem[] } | Problem[]
  const arr = Array.isArray(json) ? json : json.problems ?? []
  return sortProblems(arr.filter(p => p.type === 'question'))
}

export function saveOverride(raw: unknown) {
  const arr = Array.isArray(raw)
    ? raw
    : (raw as { problems?: Problem[] }).problems ?? []
  const questions = arr.filter((p: Problem) => p.type === 'question').map(slim)
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify({
    problems: questions,
    uploadedAt: Date.now(),
  }))
  return questions.length
}

export function clearOverride() {
  localStorage.removeItem(OVERRIDE_KEY)
}

export function getOverrideMeta(): { count: number; uploadedAt: number } | null {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY)
    if (!raw) return null
    const { problems, uploadedAt } = JSON.parse(raw)
    return { count: problems.length, uploadedAt }
  } catch { return null }
}

function sortProblems(arr: Problem[]): Problem[] {
  return [...arr].sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999))
}

export function applyFilters(
  problems: Problem[],
  { q, topic, level, status, solved, saved }: {
    q: string; topic: string; level: string
    status: string; solved: Set<string>; saved: Set<string>
  }
): Problem[] {
  return problems.filter(p => {
    if (q) {
      const lq = q.toLowerCase()
      const match = [p.title, p.normalisedTitle, p.normalizedTitle]
        .some(v => v?.toLowerCase().includes(lq))
      if (!match) return false
    }
    if (topic && p.topic !== topic) return false
    if (level && String(p.level) !== level) return false
    if (status === 'saved'    && !saved.has(p._id))  return false
    if (status === 'unsolved' && solved.has(p._id))  return false
    return true
  })
}
