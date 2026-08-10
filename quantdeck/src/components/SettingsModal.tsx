import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import {
  isUpstashEnabled,
  getUpstashUrl,
  getUpstashToken,
  setUpstashCredentials,
} from '../lib/upstash'
import { saveOverride, clearOverride, getOverrideMeta, loadProblems } from '../lib/problems'
import { pullAll, pushAll, peekRemote, downloadProgressBackup, importProgress } from '../lib/sync'

const BASE = import.meta.env.BASE_URL

export default function SettingsModal() {
  const { toggleSettings, setAllProblems, setSolved, setSaved, setNotes, setSyncStatus, syncStatus, syncError, solved, saved, notes } = useStore()
  const [dragOver, setDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsed' | 'error'>('idle')
  const [uploadPreview, setUploadPreview] = useState<{ count: number; name: string } | null>(null)
  const [urlInput, setUrlInput] = useState(getUpstashUrl())
  const [tokenInput, setTokenInput] = useState(getUpstashToken())
  const [progressMsg, setProgressMsg] = useState<string | null>(null)
  const [remotePeek, setRemotePeek] = useState<{ solved: number; saved: number; notes: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLInputElement>(null)
  const overrideMeta = getOverrideMeta()
  const syncOn = isUpstashEnabled()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSettings])

  useEffect(() => {
    if (!syncOn) { setRemotePeek(null); return }
    peekRemote().then(setRemotePeek).catch(() => setRemotePeek(null))
  }, [syncOn])

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

  function saveCredentialsOnly() {
    setUpstashCredentials(urlInput, tokenInput)
    setSyncStatus('idle', null)
    setProgressMsg(urlInput.trim() && tokenInput.trim() ? 'Cloud credentials saved — use Push / Pull below' : 'Cloud sync turned off')
    if (urlInput.trim() && tokenInput.trim()) {
      peekRemote().then(setRemotePeek).catch(() => setRemotePeek(null))
    } else {
      setRemotePeek(null)
    }
  }

  async function handlePull() {
    if (!confirm('Pull from cloud?\n\nThis REPLACES solved / saved / notes in THIS browser with whatever is in Upstash.')) return
    setSyncStatus('syncing')
    try {
      const result = await pullAll()
      setSolved(result.solved)
      setSaved(result.saved)
      setNotes(result.notes)
      setRemotePeek({ solved: result.solved.size, saved: result.saved.size, notes: Object.keys(result.notes).length })
      setSyncStatus('synced', null)
      setProgressMsg(`Pulled — ${result.solved.size} solved, ${result.saved.size} saved, ${Object.keys(result.notes).length} notes`)
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pull failed'
      setSyncStatus('error', msg)
    }
  }

  async function handlePush() {
    if (!confirm('Push to cloud?\n\nThis OVERWRITES Upstash with THIS browser’s solved / saved / notes.')) return
    setSyncStatus('syncing')
    try {
      await pushAll()
      setRemotePeek({ solved: solved.size, saved: saved.size, notes: Object.keys(notes).length })
      setSyncStatus('synced', null)
      setProgressMsg(`Pushed — ${solved.size} solved, ${saved.size} saved, ${Object.keys(notes).length} notes`)
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Push failed'
      setSyncStatus('error', msg)
    }
  }

  async function handleImportProgress(file: File) {
    try {
      const raw = JSON.parse(await file.text())
      const result = importProgress(raw)
      setSolved(result.solved)
      setSaved(result.saved)
      setNotes(result.notes)
      setProgressMsg(`Imported — ${result.solved.size} solved, ${result.saved.size} saved, ${Object.keys(result.notes).length} notes`)
    } catch {
      setProgressMsg('Import failed — use a quantdeck-progress-*.json file')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={toggleSettings}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div
        className="relative bg-bg-card border border-border sm:rounded-2xl rounded-t-2xl w-full max-w-[520px] max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto shadow-2xl scrollbar-thin pb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-bg-card z-10">
          <h2 className="text-[17px] font-semibold text-text">Settings</h2>
          <button onClick={toggleSettings} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-muted transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-7">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mb-3">Your Progress (this browser)</h3>
            <div className="bg-bg-muted rounded-xl p-4 flex flex-col gap-2.5">
              <Row label="Solved" value={<span className="text-accent-dim font-semibold">{solved.size}</span>} />
              <Row label="Saved" value={<span className="text-amber font-semibold">{saved.size}</span>} />
              <Row label="Notes" value={<span className="text-text-dim">{Object.keys(notes).length}</span>} />
            </div>
            <p className="mt-2 text-[11px] text-text-faint leading-relaxed">
              Progress is stored in this browser’s localStorage. To use another browser/phone, export a backup here and import it there.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { downloadProgressBackup(); setProgressMsg('Backup downloaded') }}
                className="flex-1 py-2.5 bg-accent text-[hsl(220,13%,8%)] font-bold text-xs rounded-lg hover:opacity-90 transition-opacity"
              >
                Export progress
              </button>
              <button
                onClick={() => progressRef.current?.click()}
                className="flex-1 py-2.5 border border-border rounded-lg text-xs font-medium text-text-dim hover:bg-bg-muted hover:text-text transition-all"
              >
                Import progress
              </button>
              <input
                ref={progressRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleImportProgress(f)
                  e.target.value = ''
                }}
              />
            </div>
            {progressMsg && (
              <p className="mt-2 text-[12px] text-accent-dim">{progressMsg}</p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-faint mb-3">Manual Cloud Sync</h3>
            <div className="bg-bg-muted rounded-xl p-4 flex flex-col gap-2.5">
              <Row label="Upstash" value={syncOn ? <Badge green>Configured</Badge> : <Badge>Not configured</Badge>} />
              {syncOn && remotePeek && (
                <>
                  <Row label="Cloud solved" value={<span className="text-accent-dim font-semibold">{remotePeek.solved}</span>} />
                  <Row label="Cloud saved" value={<span className="text-amber font-semibold">{remotePeek.saved}</span>} />
                  <Row label="Cloud notes" value={<span className="text-text-dim">{remotePeek.notes}</span>} />
                </>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-text-faint font-medium uppercase tracking-wider">Upstash REST URL</label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://xxxx.upstash.io"
                  className="w-full bg-bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-text-faint font-medium uppercase tracking-wider">Upstash REST Token</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="Your private token"
                  className="w-full bg-bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveCredentialsOnly}
                  className="flex-1 py-2.5 border border-border rounded-lg text-xs font-medium text-text-dim hover:bg-bg-muted hover:text-text transition-all"
                >
                  Save credentials
                </button>
                {syncOn && (
                  <button
                    onClick={() => {
                      setUpstashCredentials('', '')
                      setUrlInput('')
                      setTokenInput('')
                      setRemotePeek(null)
                      setSyncStatus('idle', null)
                      setProgressMsg('Cloud sync turned off')
                    }}
                    className="px-3 py-2.5 border border-border rounded-lg text-xs font-medium text-text-dim hover:text-red-400 hover:border-red-400/30 transition-all"
                  >
                    Turn off
                  </button>
                )}
              </div>

              {syncOn && (
                <div className="flex gap-2">
                  <button
                    onClick={handlePull}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 py-2.5 border border-border rounded-lg text-xs font-bold text-text-dim hover:bg-bg-muted hover:text-text disabled:opacity-50 transition-all"
                  >
                    {syncStatus === 'syncing' ? 'Working…' : 'Pull from cloud'}
                  </button>
                  <button
                    onClick={handlePush}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 py-2.5 bg-accent text-[hsl(220,13%,8%)] font-bold text-xs rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {syncStatus === 'syncing' ? 'Working…' : 'Push to cloud'}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-text-faint leading-relaxed">
                Nothing auto-syncs. <strong className="text-text-dim font-medium">Push</strong> uploads this browser → cloud.
                <strong className="text-text-dim font-medium"> Pull</strong> downloads cloud → this browser (overwrites local).
                Use a private token; don’t publish it on a public site.
              </p>
            </div>

            {syncStatus === 'error' && syncError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 leading-relaxed font-mono">
                ⚠️ <strong>Sync Error:</strong> {syncError}
              </div>
            )}
          </section>

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
                <Row label="Source" value={<span className="text-text-faint text-[12px]">Bundled (problems.json)</span>} />
              )}
            </div>

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
    <div className="flex items-center justify-between text-[13px] gap-3">
      <span className="text-text-faint shrink-0">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
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
