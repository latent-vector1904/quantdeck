import { useState, useMemo } from 'react'
import { useStore, getPage, totalPages } from '../store/useStore'

const TOPIC_COLORS: Record<string, { bg: string; fg: string }> = {
  probability:     { bg: 'rgba(109,40,217,.22)',  fg: '#a78bfa' },
  brainteasers:    { bg: 'rgba(234,88,12,.22)',   fg: '#fb923c' },
  statistics:      { bg: 'rgba(37,99,235,.22)',   fg: '#60a5fa' },
  calculus:        { bg: 'rgba(6,182,212,.2)',     fg: '#22d3ee' },
  'linear algebra':{ bg: 'rgba(5,150,105,.22)',   fg: '#34d399' },
  'game theory':   { bg: 'rgba(217,119,6,.22)',   fg: '#fbbf24' },
  combinatorics:   { bg: 'rgba(219,39,119,.22)',  fg: '#f472b6' },
}
const DEFAULT_TC = { bg: 'rgba(88,88,120,.2)', fg: '#9090b8' }

function topicColor(t?: string) {
  if (!t) return DEFAULT_TC
  const lo = t.toLowerCase()
  for (const [k, v] of Object.entries(TOPIC_COLORS)) if (lo.includes(k)) return v
  return DEFAULT_TC
}

function diffStyle(level: string | number) {
  const l = Number(level)
  if (!l) return { bg: 'rgba(100,100,120,.15)', fg: 'hsl(215,20%,55%)', bdr: 'rgba(100,100,120,.25)' }
  if (l <= 3) return { bg: 'rgba(34,197,94,.14)',  fg: 'hsl(122,65%,58%)',  bdr: 'rgba(34,197,94,.28)' }
  if (l <= 6) return { bg: 'rgba(234,179,8,.14)',  fg: 'hsl(45,90%,58%)',   bdr: 'rgba(234,179,8,.28)' }
  return           { bg: 'rgba(239,68,68,.14)',   fg: 'hsl(0,82%,63%)',    bdr: 'rgba(239,68,68,.28)' }
}

const CHECK_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[13px] h-[13px]">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
)

export default function ListView() {
  const {
    allProblems, filtered, curPage,
    search, topic, level, statusFilter,
    solved, saved,
    setSearch, setTopic, setLevel, setStatus,
    openProblem, toggleSaved,
  } = useStore()

  const topics = useMemo(() => [...new Set(allProblems.map(p => p.topic).filter(Boolean))].sort(), [allProblems])
  const levels = useMemo(() => [...new Set(allProblems.map(p => Number(p.level)).filter(n => n > 0))].sort((a,b)=>a-b), [allProblems])

  const page  = getPage(filtered, curPage)
  const pages = totalPages(filtered)

  const setPage = useStore(s => s.curPage)
  const _setPage = (n: number) => useStore.setState({ curPage: Math.max(1, Math.min(n, pages)) })

  return (
    <div className="px-10 py-8 max-w-[1200px] mx-auto w-full">
      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-5 max-sm:grid-cols-1">
        {/* Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-text-faint uppercase tracking-wider">Search</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search problems…"
            className="bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        {/* Topic */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-text-faint uppercase tracking-wider">Topic</label>
          <select
            value={topic} onChange={e => setTopic(e.target.value)}
            className="bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="">All topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {/* Level */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-text-faint uppercase tracking-wider">Difficulty</label>
          <select
            value={level} onChange={e => setLevel(e.target.value)}
            className="bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-accent transition-colors appearance-none"
          >
            <option value="">All levels</option>
            {levels.map(l => <option key={l} value={String(l)}>Level {l}</option>)}
          </select>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 mb-4">
        {(['all', 'saved', 'unsolved'] as const).map(s => (
          <button
            key={s}
            data-status={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all capitalize ${
              statusFilter === s
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'border-border text-text-faint hover:text-text-dim hover:border-bg-accent'
            }`}
          >{s}</button>
        ))}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 mb-3 text-[13px] text-text-faint">
        <span>{filtered.length} problem{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-accent-dim font-semibold">{solved.size} solved</span>
        <span className="text-amber font-semibold">{saved.size} saved</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['#','Title','Topic','Difficulty','Asked In','','Status'].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-left text-[11px] font-semibold text-text-faint uppercase tracking-wider ${i >= 2 && i <= 5 ? 'max-lg:hidden' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!page.length && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-text-faint text-sm">No problems match your filters.</td></tr>
            )}
            {page.map(p => {
              const isSolved = solved.has(p._id)
              const isSaved  = saved.has(p._id)
              const tc = topicColor(p.topic)
              const dc = diffStyle(p.level)
              const logos = (p.askedIn || []).filter(c => c.logoURL).slice(0, 5)
              return (
                <tr
                  key={p._id}
                  onClick={() => openProblem(p)}
                  className="border-b border-border/50 hover:bg-bg-muted/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3.5 text-sm text-text-faint w-12">{p.order}</td>
                  <td className={`px-4 py-3.5 text-sm font-medium ${isSolved ? 'text-accent-dim' : 'text-text'}`}>
                    {p.title}
                  </td>
                  <td className="px-4 py-3.5 max-lg:hidden">
                    {p.topic && (
                      <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium" style={{ background: tc.bg, color: tc.fg }}>
                        {p.topic}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 max-lg:hidden">
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold border" style={{ background: dc.bg, color: dc.fg, borderColor: dc.bdr }}>
                      {p.level || '?'}/10
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-lg:hidden">
                    {logos.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {logos.map(c => (
                          <img key={c.name} src={c.logoURL} alt={c.name} className="w-5 h-5 rounded-full object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                        ))}
                      </div>
                    ) : <span className="text-text-faint">—</span>}
                  </td>
                  <td className="px-2 py-3.5 max-lg:hidden w-9 text-center">
                    <button
                      onClick={e => { e.stopPropagation(); toggleSaved(p._id) }}
                      className={`transition-all ${isSaved ? 'text-amber opacity-100' : 'text-text-faint opacity-30 group-hover:opacity-60'}`}
                    >
                      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all ${isSolved ? 'bg-accent border-accent text-[hsl(220,13%,8%)]' : 'border-border'}`}>
                      {isSolved && CHECK_SVG}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-6">
          <button
            onClick={() => _setPage(curPage - 1)}
            disabled={curPage === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-dim border border-border hover:bg-bg-card disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
            Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === pages || Math.abs(p - curPage) <= 2)
            .reduce<(number | '…')[]>((acc, p, i, arr) => {
              if (i > 0 && typeof arr[i-1] === 'number' && (p - (arr[i-1] as number)) > 1) acc.push('…')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) => p === '…'
              ? <span key={`e${i}`} className="px-2 py-1.5 text-sm text-text-faint">…</span>
              : <button key={p} onClick={() => _setPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${curPage === p ? 'bg-accent/15 text-accent border border-accent/30' : 'text-text-dim hover:bg-bg-card border border-transparent'}`}
                >{p}</button>
            )}
          <button
            onClick={() => _setPage(curPage + 1)}
            disabled={curPage === pages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-dim border border-border hover:bg-bg-card disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
