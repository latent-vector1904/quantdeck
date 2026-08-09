import { useState, useEffect, useRef, useCallback } from 'react'
import type { Problem } from '../types'

export interface ScheduleItem {
  kind: 'hint' | 'sol'
  idx: number
  label: string
  unlockAt: number
}

interface FocusState {
  on: boolean
  startedAt: number
  pausedAt: number
  accumulatedPausedMs: number
  unlockedExtra: Set<string>
}

const INITIAL: FocusState = {
  on: false, startedAt: 0, pausedAt: 0, accumulatedPausedMs: 0, unlockedExtra: new Set(),
}

export function useFocusMode(current: Problem | null) {
  const [state, setState] = useState<FocusState>(INITIAL)
  const [tick, setTick]   = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function elapsedMs(s: FocusState = state): number {
    if (!s.on) return 0
    const now = Date.now()
    const pausedNow = s.pausedAt ? now - s.pausedAt : 0
    return now - s.startedAt - s.accumulatedPausedMs - pausedNow
  }

  function schedule(p: Problem | null): ScheduleItem[] {
    if (!p) return []
    const hints = [p.hint1, p.hint2, p.hint3, p.hint4, p.hint5].filter(h => h?.trim())
    const sols  = [p.solution, p.solution2, p.solution3].filter(s => s?.trim())
    const items: ScheduleItem[] = []
    hints.forEach((_, i) => items.push({ kind: 'hint', idx: i, label: `Hint ${i + 1}`, unlockAt: (10 + i * 5) * 60_000 }))
    if (sols.length) {
      const solAt = hints.length > 0 ? (10 + hints.length * 5) * 60_000 : 10 * 60_000
      sols.forEach((_, j) => items.push({ kind: 'sol', idx: j, label: sols.length > 1 ? `Solution ${j + 1}` : 'Solution', unlockAt: solAt + j * 60_000 }))
    }
    return items
  }

  function isUnlocked(kind: string, idx: number): boolean {
    if (!state.on) return true
    if (state.unlockedExtra.has(`${kind}:${idx}`)) return true
    const item = schedule(current).find(x => x.kind === kind && x.idx === idx)
    if (!item) return true
    return elapsedMs() >= item.unlockAt
  }

  const start = useCallback(() => {
    const next: FocusState = { on: true, startedAt: Date.now(), pausedAt: 0, accumulatedPausedMs: 0, unlockedExtra: new Set() }
    setState(next)
    if (!timerRef.current) timerRef.current = setInterval(() => setTick(t => t + 1), 1000)
  }, [])

  const stop = useCallback(() => {
    setState(INITIAL)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setTick(0)
  }, [])

  const resetTimer = useCallback(() => {
    setState(s => ({ ...s, startedAt: Date.now(), pausedAt: 0, accumulatedPausedMs: 0, unlockedExtra: new Set() }))
  }, [])

  const pauseResume = useCallback(() => {
    setState(s => {
      if (!s.on) return s
      if (s.pausedAt) {
        return { ...s, accumulatedPausedMs: s.accumulatedPausedMs + Date.now() - s.pausedAt, pausedAt: 0 }
      }
      return { ...s, pausedAt: Date.now() }
    })
  }, [])

  const unlockNow = useCallback((kind: string, idx: number) => {
    setState(s => {
      const extra = new Set(s.unlockedExtra)
      extra.add(`${kind}:${idx}`)
      return { ...s, unlockedExtra: extra }
    })
  }, [])

  // Reset timer when navigating to a new problem
  useEffect(() => {
    if (state.on) resetTimer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const elapsed  = elapsedMs()
  const sched    = schedule(current)
  const running  = state.on && !state.pausedAt
  const paused   = state.on && !!state.pausedAt

  return {
    on: state.on, running, paused, elapsed, tick,
    schedule: sched, isUnlocked,
    start, stop, resetTimer, pauseResume, unlockNow,
  }
}

export function fmtMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
