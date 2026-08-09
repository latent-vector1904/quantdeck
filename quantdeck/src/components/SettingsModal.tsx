import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { isKvdbEnabled } from '../lib/kvdb'
import { saveOverride, clearOverride, getOverrideMeta, loadProblems } from '../lib/problems'
import { pullAndMerge } from '../lib/sync'

const BASE = import.meta.env.BASE_URL

export default function SettingsModal() {
  const { toggleSettings, setAllProblems, setSolved, setSaved, setNotes, setSyncStatus, syncStatus, solved, saved, notes } = useStore()
  const [dragOver, setDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsed' | 'error'>('idle')
  const [uploadPreview, setUploadPreview] = useState<{ count: number; name: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const overrideMeta = getOverrideMeta()

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSettings])

  async function handleFile(file: File) {
    try {
      const text = await file.text()
      const raw  = JSON.parse(text)
      const count = saveOverride(raw)
      setUploadPreview({ count, name: file.name })
      setUploadStatus('parsed')
    } catch {
      setUploadStatus('error')
    }
  }

  async function applyUpload() {
    const problems = await loadProblems(BASE)
    setAllProblems(problems)
    setUploadStatus('idle')
    setUploadPreview(null)
    toggleSettings()
  }

  function cancelUpload() {
    clearOverride()
    setUploadStatus('idle')
    setUploadPreview(null)
  }

  async function handleManualSync() {
    setSyncStatus('syncing')
    try {
      const result = await pullAndMerge()
      setSolved(result.solved)
      setSaved(result.saved)
      setNotes(result.notes)
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={toggleSettings}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div
        className="relative bg-bg-card border border-border rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl scrollbar-thin"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-bg-card z-10">
          <h2 className="text-[17px] font-semibold text-text">Settings</h2>
          <button onClick={toggleSettings} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-muted transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-7">
          {/* Sync section */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mb-3">Sync</h3>
            <div className="bg-bg-muted rounded-xl p-4 flex flex-col gap-2.5">
              <Row label="KVDB.io Sync" value={isKvdbEnabled ? <Badge green>Connected</Badge> : <Badge>Not configured</Badge>} />
              <Row label="Solved problems" value={<span className="text-accent-dim font-semibold">{solved.size}</span>} />
              <Row label="Saved problems"  value={<span className="text-amber font-semibold">{saved.size}</span>} />
              <Row label="Problems with notes" value={<span className="text-text-dim">{Object.keys(notes).length}</span>} />
            </div>
            {isKvdbEnabled && (
              <button
                onClick={handleManualSync}
                disabled={syncStatus === 'syncing'}
                className="mt-3 w-full py-2.5 border border-border rounded-lg text-sm font-medium text-text-dim hover:bg-bg-muted hover:text-text disabled:opacity-50 transition-all"
              >
                {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'synced' ? '✓ Synced' : 'Sync now'}
              </button>
            )}
            {!isKvdbEnabled && (
              <p className="mt-2.5 text-[12px] text-text-faint leading-relaxed">
                Add <code className="bg-bg-muted px-1.5 py-0.5 rounded text-accent-dim">VITE_KVDB_BUCKET_ID</code> to your <code className="bg-bg-muted px-1.5 py-0.5 rounded text-text">.env</code> to enable cross-device sync.
              </p>
            )}
          </section>

          {/* Problems data section */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mb-3">Problems Data</h3>
            <div className="bg-bg-muted rounded-xl p-4 mb-3 flex flex-col gap-2">
              {overrideMeta ? (
                <>
                  <Row label="Source" value={<Badge green>Uploaded file</Badge>} />
                  <Row label="Problems" value={<span className="text-text-dim">{overrideMeta.count}</span>} />
                  <Row label="Uploaded" value={<span className="text-text-faint text-[12px]">{new Date(overrideMeta.uploadedAt).toLocaleString()}</span>} />
                </>
              ) : (
                <>
                  <Row label="Source" value={<span className="text-text-faint text-[12px]">Bundled (problems.json)</span>} />
                </>
              )}
            </div>

            {/* Upload zone */}
            {uploadStatus === 'idle' && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-bg-accent hover:bg-bg-muted/50'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-2 text-text-faint">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p className="text-sm font-medium text-text-dim">Drop <code>quantprof_problems.json</code> here</p>
                <p className="text-[12px] text-text-faint mt-1">or click to browse</p>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}

            {uploadStatus === 'parsed' && uploadPreview && (
              <div className="border border-accent/30 bg-accent/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-accent-dim flex-shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-sm font-semibold text-text">{uploadPreview.name} parsed</span>
                </div>
                <p className="text-[13px] text-text-dim mb-4">{uploadPreview.count} problems found</p>
                <div className="flex gap-2">
                  <button onClick={applyUpload} className="flex-1 py-2.5 bg-accent text-[hsl(220,13%,8%)] rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                    Apply & reload
                  </button>
                  <button onClick={cancelUpload} className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-dim hover:bg-bg-muted hover:text-text transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-4 text-sm text-red-400">
                Failed to parse file. Make sure it's a valid <code>quantprof_problems.json</code>.
                <button onClick={() => setUploadStatus('idle')} className="ml-2 underline opacity-70 hover:opacity-100">Try again</button>
              </div>
            )}

            {overrideMeta && uploadStatus === 'idle' && (
              <button
                onClick={() => { clearOverride(); loadProblems(BASE).then(p => { setAllProblems(p) }) }}
                className="mt-2.5 w-full py-2.5 border border-border rounded-lg text-sm font-medium text-text-dim hover:bg-bg-muted hover:text-red-400 hover:border-red-400/30 transition-all"
              >
                Clear uploaded data — revert to bundled
              </button>
            )}
          </section>

          {/* Keyboard shortcuts */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mb-3">Keyboard Shortcuts</h3>
            <div className="bg-bg-muted rounded-xl p-4 flex flex-col gap-2 text-[13px]">
              {[
                ['/', 'Focus search'],
                ['Tab', 'Problem ↔ Solution'],
                ['N', 'Toggle notes'],
                ['F', 'Toggle focus mode'],
                ['← / h', 'Previous problem'],
                ['→ / l', 'Next problem'],
                ['Escape', 'Close / back'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-text-faint">{desc}</span>
                  <kbd className="px-2 py-0.5 bg-bg border border-border rounded text-[11px] font-mono text-text-dim">{key}</kbd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-text-faint">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Badge({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${green ? 'bg-accent/10 text-accent-dim' : 'bg-bg-accent text-text-faint'}`}>
      {children}
    </span>
  )
}
