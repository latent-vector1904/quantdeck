import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { loadProblems } from './lib/problems'
import { pullAndMerge } from './lib/sync'
import { isKvdbEnabled } from './lib/kvdb'
import Navbar       from './components/Navbar'
import OfflineBanner from './components/OfflineBanner'
import ListView      from './components/ListView'
import DetailView    from './components/DetailView'
import SettingsModal from './components/SettingsModal'
import { useOnlineStatus } from './hooks/useOnlineStatus'

const BASE = import.meta.env.BASE_URL

export default function App() {
  const { current, setAllProblems, setSolved, setSaved, setNotes, setSyncStatus, settingsOpen } = useStore()
  const online = useOnlineStatus()

  // Load problems
  useEffect(() => {
    loadProblems(BASE)
      .then(p => setAllProblems(p))
      .catch(console.error)
  }, [setAllProblems])

  // Sync on mount + when coming back online
  useEffect(() => {
    if (!isKvdbEnabled) return
    setSyncStatus('syncing')
    pullAndMerge()
      .then(({ solved, saved, notes }) => {
        setSolved(solved)
        setSaved(saved)
        setNotes(notes)
        setSyncStatus('synced', null)
        setTimeout(() => setSyncStatus('idle'), 2000)
      })
      .catch((err: Error) => setSyncStatus('error', err?.message || 'Sync failed'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  // Real-time sync — poll every 5 s when KVDB is enabled
  useEffect(() => {
    if (!isKvdbEnabled) return
    const id = setInterval(() => {
      pullAndMerge().then(({ solved, saved, notes, changed }) => {
        if (changed) { setSolved(solved); setSaved(saved); setNotes(notes) }
      }).catch((err: Error) => {
        setSyncStatus('error', err?.message || 'Sync failed')
      })
    }, 5_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {!online && <OfflineBanner />}
      <main className="flex-1 flex flex-col">
        {current ? <DetailView /> : <ListView />}
      </main>
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
