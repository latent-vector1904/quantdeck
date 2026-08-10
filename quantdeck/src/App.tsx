import { useEffect } from 'react'
import { useStore } from './store/useStore'
import { loadProblems } from './lib/problems'
import Navbar       from './components/Navbar'
import OfflineBanner from './components/OfflineBanner'
import ListView      from './components/ListView'
import DetailView    from './components/DetailView'
import SettingsModal from './components/SettingsModal'
import { useOnlineStatus } from './hooks/useOnlineStatus'

const BASE = import.meta.env.BASE_URL

export default function App() {
  const { current, setAllProblems, settingsOpen } = useStore()
  const online = useOnlineStatus()

  // Load problems only — progress stays local until you Push/Pull in Settings
  useEffect(() => {
    loadProblems(BASE)
      .then(p => setAllProblems(p))
      .catch(console.error)
  }, [setAllProblems])

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
