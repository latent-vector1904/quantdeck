import { useState, useRef, useEffect } from 'react'
import { rich, renderMath } from '../../lib/katex'

interface Props {
  label: string
  html: string
  isHint?: boolean
  locked?: boolean
  lockMeta?: string
  onUnlockNow?: () => void
}

export default function CollapsibleCard({ label, html, isHint, locked, lockMeta, onUnlockNow }: Props) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && bodyRef.current) renderMath(bodyRef.current)
  }, [open])

  // Force close when locked
  useEffect(() => { if (locked) setOpen(false) }, [locked])

  return (
    <div className={`border border-border rounded-xl bg-bg-card overflow-hidden transition-opacity ${locked ? 'opacity-80' : ''}`}>
      <div
        onClick={() => !locked && setOpen(o => !o)}
        className={`flex items-center justify-between px-5 py-4 select-none transition-colors ${locked ? 'cursor-default' : 'cursor-pointer hover:bg-bg-muted'}`}
      >
        <span className={`text-[17px] font-medium flex items-center gap-2 ${isHint ? 'text-accent-dim' : 'text-text-dim'}`}>
          {locked && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5 opacity-60">
              <rect x="5" y="11" width="14" height="10" rx="2"/>
              <path d="M8 11V8a4 4 0 018 0v3"/>
            </svg>
          )}
          {label}
        </span>
        <div className="flex items-center gap-3">
          {locked && lockMeta && (
            <span className="text-[12px] text-text-faint tab-nums">{lockMeta}</span>
          )}
          {locked && onUnlockNow && (
            <button
              onClick={e => { e.stopPropagation(); onUnlockNow() }}
              className="text-[11px] text-text-dim underline opacity-60 hover:opacity-100 transition-opacity"
            >
              unlock now
            </button>
          )}
          {!locked && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 text-text-faint transition-transform ${open ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </div>
      </div>
      {open && (
        <div
          ref={bodyRef}
          className="px-5 pb-5 border-t border-border text-[17px] leading-relaxed text-text-dim space-y-3 coll-body"
          dangerouslySetInnerHTML={{ __html: rich(html) }}
        />
      )}
    </div>
  )
}
