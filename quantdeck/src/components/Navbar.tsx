import { useStore } from '../store/useStore'
import SyncDot from './SyncDot'

export default function Navbar() {
  const { closeProblem, toggleSettings } = useStore()

  return (
    <nav className="sticky top-0 z-50 h-[52px] sm:h-[60px] bg-bg/95 backdrop-blur border-b border-border flex items-center px-4 sm:px-6 md:px-10 gap-3 pt-[env(safe-area-inset-top)]">
      <button
        onClick={() => { closeProblem() }}
        className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 hover:opacity-80 transition-opacity touch-manipulation"
      >
        <svg width="28" height="28" viewBox="0 0 30 30" fill="none" className="sm:w-[30px] sm:h-[30px]">
          <rect width="30" height="30" rx="6" fill="hsl(172 66% 48% / 0.12)"/>
          <rect x="4" y="4" width="9" height="9" rx="2" fill="hsl(213 94% 62%)"/>
          <rect x="17" y="4" width="9" height="9" rx="2" fill="hsl(172 66% 48% / 0.4)"/>
          <rect x="4" y="17" width="9" height="9" rx="2" fill="hsl(172 66% 48% / 0.4)"/>
          <rect x="17" y="17" width="9" height="9" rx="2" fill="hsl(213 94% 62%)"/>
        </svg>
        <span className="text-[16px] sm:text-[18px] font-bold tracking-tight">QuantDeck</span>
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <SyncDot />
        <button
          onClick={toggleSettings}
          title="Settings"
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg border border-border text-text-faint flex items-center justify-center hover:text-text-dim hover:border-bg-accent transition-all touch-manipulation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </nav>
  )
}
