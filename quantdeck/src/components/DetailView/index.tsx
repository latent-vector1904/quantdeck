import { useRef, useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { rich, renderMath } from '../../lib/katex'
import CollapsibleCard from './CollapsibleCard'
import FocusPopover from '../FocusMode/FocusPopover'
import NotesSidebar from '../Notes/NotesSidebar'
import { useFocusMode, fmtMs } from '../../hooks/useFocusMode'

export default function DetailView() {
  const {
    current, filtered, solved, saved,
    curTab, notesOpen,
    setCurTab, setNotesOpen,
    toggleSolved, toggleSaved,
    navigate, closeProblem,
  } = useStore()

  const p = current!
  const fm = useFocusMode(current)
  const [focusPopOpen, setFocusPopOpen] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const probRef = useRef<HTMLDivElement>(null)
  const solRef  = useRef<HTMLDivElement>(null)

  const isSolved = solved.has(p._id)
  const isSaved  = saved.has(p._id)
  const idx = filtered.findIndex(x => x._id === p._id)

  const hints = [p.hint1, p.hint2, p.hint3, p.hint4, p.hint5].filter(Boolean) as string[]
  const sols  = [p.solution, p.solution2, p.solution3].filter(Boolean) as string[]

  useEffect(() => {
    if (curTab === 'problem' && probRef.current) renderMath(probRef.current)
    if (curTab === 'solution' && solRef.current) renderMath(solRef.current)
  }, [curTab, p._id])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft'  || e.key === 'h') navigate(-1)
      if (e.key === 'ArrowRight' || e.key === 'l') navigate(1)
      if (e.key === 'Tab') { e.preventDefault(); setCurTab(curTab === 'problem' ? 'solution' : 'problem') }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setNotesOpen(!notesOpen) }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setFocusPopOpen(v => !v) }
      if (e.key === 'Escape') {
        if (focusPopOpen) { setFocusPopOpen(false); return }
        if (notesOpen) { setNotesOpen(false); return }
        closeProblem()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [curTab, notesOpen, focusPopOpen, navigate, setCurTab, setNotesOpen, closeProblem])

  function checkAnswer() {
    if (!p.answer || !answerInput.trim()) return
    const u = answerInput.trim().toLowerCase()
    const a = String(p.answer).trim().toLowerCase()
    const ok = u === a || (!isNaN(Number(a)) && !isNaN(Number(u)) && Number(u) === Number(a))
    setFeedback(ok ? 'correct' : 'wrong')
    if (ok && !isSolved) toggleSolved(p._id)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-11 py-4 border-b border-border flex-wrap gap-y-2.5">
        <button onClick={closeProblem} className="px-4 py-2 bg-bg-card border border-border rounded-lg text-sm font-medium text-text hover:bg-bg-muted transition-colors">
          ← Back
        </button>
        {isSolved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-accent-dim">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M20 6L9 17l-5-5"/></svg>
            Solved
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => navigate(-1)} disabled={idx <= 0} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-text hover:bg-bg-card disabled:opacity-30 disabled:pointer-events-none transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
            Prev
          </button>
          <button onClick={() => navigate(1)} disabled={idx >= filtered.length - 1} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-text-dim hover:text-text hover:bg-bg-card disabled:opacity-30 disabled:pointer-events-none transition-all">
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Shell (content + notes sidebar) */}
      <div className="flex flex-1 items-start">
        <div className="flex-1 min-w-0 max-w-[860px] mx-auto px-11 py-8 pb-24 w-full">
          {/* Tab row */}
          <div className="flex items-center gap-4 mb-7 flex-wrap gap-y-3">
            {/* Tabs */}
            <div className="flex bg-bg-card border border-border rounded-[9px] p-[3px] gap-0.5">
              {(['problem','solution'] as const).map(tab => (
                <button key={tab} onClick={() => setCurTab(tab)}
                  className={`px-[18px] py-[7px] rounded-[6px] text-sm font-medium capitalize transition-all ${curTab === tab ? 'bg-bg-muted text-text' : 'text-text-dim hover:text-text'}`}
                >{tab}</button>
              ))}
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2.5 flex-wrap">
              <span className="px-3.5 py-1.5 bg-[hsl(213_94%_62%_/_0.12)] border border-[hsl(213_94%_62%_/_0.25)] rounded-full text-[13px] font-semibold text-accent-dim">
                Lvl {p.level || '?'}/10
              </span>

              {/* Focus Mode */}
              <div className="relative">
                <button
                  onClick={() => setFocusPopOpen(v => !v)}
                  title="Focus mode (F)"
                  className={`relative w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                    fm.running ? 'border-accent/35 bg-accent/6 text-accent'
                    : fm.paused ? 'border-amber/35 bg-amber/6 text-amber'
                    : 'border-border text-text-faint hover:text-text-dim hover:border-bg-accent'
                  }`}
                >
                  {fm.on && (
                    <span className={`absolute top-[5px] right-[5px] w-[7px] h-[7px] rounded-full ${fm.paused ? 'bg-amber' : 'bg-accent animate-pulse'}`}/>
                  )}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="12" cy="12" r="9"/>
                    <polyline points="12 7 12 12 15.5 14"/>
                  </svg>
                </button>
                {focusPopOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFocusPopOpen(false)}/>
                    <div className="absolute top-[calc(100%+10px)] right-0 z-50">
                      <FocusPopover fm={fm} />
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              <button
                onClick={() => setNotesOpen(!notesOpen)}
                title="Notes (N)"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                  notesOpen ? 'border-accent/35 bg-accent/6 text-accent' : 'border-border text-text-faint hover:text-text-dim hover:border-bg-accent'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                  <line x1="9" y1="17" x2="13" y2="17"/>
                </svg>
              </button>

              {/* Save */}
              <button
                onClick={() => toggleSaved(p._id)}
                title="Save for later"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                  isSaved ? 'border-amber/30 text-amber' : 'border-border text-text-faint hover:text-text-dim hover:border-bg-accent'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
              </button>

              {/* Share */}
              <button
                onClick={() => navigator.clipboard?.writeText(p.title + ' — QuantDeck')}
                title="Copy title"
                className="w-9 h-9 rounded-lg border border-border text-text-faint hover:text-text-dim hover:border-bg-accent flex items-center justify-center transition-all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[32px] font-bold tracking-tight leading-tight text-text mb-6">{p.title}</h1>

          {/* Problem pane */}
          {curTab === 'problem' && (
            <div>
              <div
                ref={probRef}
                className="text-[19px] leading-[1.85] text-text-dim space-y-3"
                dangerouslySetInnerHTML={{ __html: rich(p.question) }}
              />
              {/* Answer */}
              {p.answer != null && String(p.answer).trim() !== '' && (
                <div className="mt-8 pt-7 border-t border-border">
                  <div className="flex gap-3 items-stretch">
                    <input
                      type="text"
                      value={answerInput}
                      onChange={e => { setAnswerInput(e.target.value); setFeedback(null) }}
                      onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                      placeholder="Place answer here"
                      className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3.5 text-[15px] text-text placeholder-text-faint focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={checkAnswer}
                      className="flex items-center gap-2 px-6 bg-accent text-[hsl(220,13%,8%)] rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-85 transition-opacity"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Submit
                    </button>
                  </div>
                  {feedback && (
                    <p className={`mt-2.5 text-sm font-medium ${feedback === 'correct' ? 'text-accent-dim' : 'text-red-400'}`}>
                      {feedback === 'correct' ? '✓ Correct!' : '✗ Not quite — try again'}
                    </p>
                  )}
                  <button
                    onClick={() => toggleSolved(p._id)}
                    className={`mt-3.5 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                      isSolved
                        ? 'bg-accent border-accent text-[hsl(220,13%,8%)] font-semibold'
                        : 'border-border text-text-dim hover:border-accent-dim hover:text-accent-dim'
                    }`}
                  >
                    {isSolved ? '✓ Solved' : 'Mark as solved'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Solution pane */}
          {curTab === 'solution' && (
            <div ref={solRef} className="flex flex-col gap-2">
              {hints.map((h, i) => (
                <CollapsibleCard
                  key={`hint-${i}`}
                  label={`Hint ${i + 1}`}
                  html={h}
                  isHint
                  locked={!fm.isUnlocked('hint', i)}
                  lockMeta={!fm.isUnlocked('hint', i) ? fmtMs(Math.max(0, (fm.schedule.find(s => s.kind==='hint' && s.idx===i)?.unlockAt ?? 0) - fm.elapsed)) : undefined}
                  onUnlockNow={() => fm.unlockNow('hint', i)}
                />
              ))}
              {sols.map((s, i) => (
                <CollapsibleCard
                  key={`sol-${i}`}
                  label={sols.length > 1 ? `Solution ${i + 1}` : 'Solution'}
                  html={s}
                  locked={!fm.isUnlocked('sol', i)}
                  lockMeta={!fm.isUnlocked('sol', i) ? fmtMs(Math.max(0, (fm.schedule.find(x => x.kind==='sol' && x.idx===i)?.unlockAt ?? 0) - fm.elapsed)) : undefined}
                  onUnlockNow={() => fm.unlockNow('sol', i)}
                />
              ))}
              {hints.length === 0 && sols.length === 0 && (
                <p className="text-text-faint text-sm py-8 text-center">No hints or solution available.</p>
              )}
            </div>
          )}
        </div>

        {/* Notes sidebar */}
        <aside className={`flex-shrink-0 bg-bg-card border-l border-border sticky top-[60px] self-start h-[calc(100vh-60px)] transition-[width] duration-[250ms] ease-in-out overflow-hidden ${notesOpen ? 'w-[380px] max-md:w-full max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:top-[60px] max-md:z-40' : 'w-0 border-l-transparent'}`}>
          <div className="w-[380px] h-full flex flex-col">
            <div className="flex items-center justify-between px-[22px] pt-[22px] pb-0 flex-shrink-0">
              <span className="text-[13px] font-semibold uppercase tracking-wider">Notes</span>
              <button onClick={() => setNotesOpen(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-muted transition-all">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <NotesSidebar problemId={p._id} />
          </div>
        </aside>
      </div>
    </div>
  )
}
