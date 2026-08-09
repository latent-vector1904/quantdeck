import type { useFocusMode } from '../../hooks/useFocusMode'
import { fmtMs } from '../../hooks/useFocusMode'

type FM = ReturnType<typeof useFocusMode>

export default function FocusPopover({ fm }: { fm: FM }) {
  const { on, running, paused, elapsed, schedule, isUnlocked, start, stop, pauseResume, unlockNow } = fm

  const nextItem = on ? schedule.find(x => !isUnlocked(x.kind, x.idx)) : null

  return (
    <div className="w-[320px] bg-bg-card border border-border rounded-xl p-[18px] shadow-[0_14px_38px_rgba(0,0,0,.5)]">
      {/* Timer */}
      <div className="text-[30px] font-bold text-text text-center tab-nums tracking-tight leading-none">
        {fmtMs(elapsed)}
      </div>
      <div className="text-[11px] text-center mt-1 mb-3.5 uppercase tracking-widest font-medium">
        {!on    ? <span className="text-text-faint">Off</span>
        : paused ? <span className="text-amber">Paused</span>
        :           <span className="text-accent">● Running</span>}
      </div>

      {/* Next event */}
      {nextItem && (
        <div className="flex items-center justify-between bg-bg-muted rounded-lg px-3 py-2.5 mb-3 text-[12.5px]">
          <span className="text-text-dim">Next: {nextItem.label}</span>
          <strong className="text-text tab-nums">{fmtMs(nextItem.unlockAt - elapsed)}</strong>
        </div>
      )}
      {on && !nextItem && schedule.length > 0 && (
        <div className="flex items-center justify-between bg-bg-muted rounded-lg px-3 py-2.5 mb-3 text-[12.5px]">
          <span className="text-text-dim">All unlocked</span>
          <strong className="text-accent-dim">✓</strong>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 mb-3.5">
        <button
          onClick={() => on ? pauseResume() : start()}
          className={`flex-1 py-2 px-3 text-[12.5px] font-semibold rounded-lg border transition-all ${
            !on || paused
              ? 'bg-accent border-accent text-[hsl(220,13%,8%)]'
              : 'border-border text-text-dim hover:bg-bg-muted hover:text-text'
          }`}
        >
          {!on ? 'Start' : paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={() => fm.resetTimer()}
          disabled={!on}
          className="flex-1 py-2 px-3 text-[12.5px] font-medium rounded-lg border border-border text-text-dim hover:bg-bg-muted hover:text-text disabled:opacity-30 disabled:pointer-events-none transition-all"
        >Reset</button>
        {on && (
          <button
            onClick={stop}
            className="flex-1 py-2 px-3 text-[12.5px] font-medium rounded-lg border border-border text-text-dim hover:bg-bg-muted hover:text-text transition-all"
          >Stop</button>
        )}
      </div>

      {/* Timeline */}
      <div className="text-[10.5px] font-semibold text-text-faint uppercase tracking-widest mb-1.5">
        Unlock schedule
      </div>
      {schedule.length === 0 ? (
        <div className="text-[12px] text-text-faint px-2 py-1">No hints or solution for this problem.</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {schedule.map(x => {
            const unlocked = isUnlocked(x.kind, x.idx)
            const rem = Math.max(0, x.unlockAt - elapsed)
            return (
              <div key={`${x.kind}:${x.idx}`} className={`flex items-center justify-between px-2 py-[7px] rounded-lg text-[13px] ${unlocked ? 'text-accent-dim' : ''}`}>
                <span className="flex items-center gap-1.5 text-text-dim">
                  {!unlocked && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3 h-3 opacity-60">
                      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>
                    </svg>
                  )}
                  {unlocked ? <span className="text-accent-dim">{x.label}</span> : x.label}
                </span>
                <span className="flex items-center gap-2 text-[12px] tab-nums">
                  {unlocked
                    ? <span className="text-accent-dim font-semibold text-[11px]">UNLOCKED</span>
                    : <>
                        <span className="text-text-faint">{on ? fmtMs(rem) : fmtMs(x.unlockAt)}</span>
                        {on && (
                          <button onClick={() => unlockNow(x.kind, x.idx)} className="text-[11px] text-text-dim underline opacity-60 hover:opacity-100 transition-opacity">
                            unlock
                          </button>
                        )}
                      </>
                  }
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
