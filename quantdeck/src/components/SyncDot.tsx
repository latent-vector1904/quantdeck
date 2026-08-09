import { useStore } from '../store/useStore'
import { isUpstashEnabled } from '../lib/upstash'

export default function SyncDot() {
  const status = useStore(s => s.syncStatus)
  if (!isUpstashEnabled()) return null

  if (status === 'idle') return null

  if (status === 'syncing') return (
    <div title="Syncing…" className="w-3.5 h-3.5">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-text-faint animate-spin">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".2"/>
        <path d="M21 12a9 9 0 00-9-9"/>
      </svg>
    </div>
  )

  if (status === 'synced') return (
    <div title="Synced" className="flex items-center gap-1 text-[11px] text-accent-dim font-medium animate-fade">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Synced
    </div>
  )

  if (status === 'error') return (
    <div title="Sync failed" className="text-[11px] text-red-400 font-medium">Sync error</div>
  )

  return null
}
