import { useEffect, useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { Welcome } from './components/home/Welcome'
import { ProfileView } from './components/profile/ProfileView'
import { SetupForm } from './components/setup/SetupForm'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { syncProfileToServer } from './lib/profileApi'
import { emptyProfile, type ProfileData } from './types/profile'
import './App.css'

type View = 'welcome' | 'setup' | 'profile'

function App() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  const [view, setView] = useState<View>(() =>
    loadProfile().lastUpdated ? 'profile' : 'welcome',
  )
  const [notice, setNotice] = useState('')

  // Push whatever is already saved locally (e.g. from before backend sync
  // existed, or a previous session where the API was unreachable).
  useEffect(() => {
    const existing = loadProfile()
    if (existing.lastUpdated) void syncProfileToServer(existing)
  }, [])

  function startSetup() {
    setView('setup')
    setNotice('')
  }

  function goHome() {
    setView(profile.lastUpdated ? 'profile' : 'welcome')
    setNotice('')
  }

  function completeSetup(next: ProfileData) {
    const saved = saveProfile(next)
    setProfile(saved)
    setView('profile')
    setNotice('')
    void syncProfileToServer(saved).then((result) => {
      if (!result.ok) setNotice(`Saved on this device. ${result.error}`)
    })
  }

  function saveEdits(next: ProfileData) {
    const saved = saveProfile(next)
    setProfile(saved)
    void syncProfileToServer(saved).then((result) => {
      if (!result.ok) setNotice(`Saved on this device. ${result.error}`)
    })
  }

  function resetProfile() {
    clearStoredProfile()
    const blank = emptyProfile()
    setProfile(blank)
    setView('setup')
    setNotice('')
  }

  function goTo(id: AppNavId) {
    if (id === 'profile') {
      setView('profile')
      setNotice('')
    }
  }

  return (
    <AppShell
      active={view === 'profile' ? 'profile' : null}
      postcode={profile.postcode}
      hasProfile={Boolean(profile.lastUpdated)}
      onNavigate={goTo}
      onLogoClick={goHome}
    >
      {notice ? (
        <p className="app-notice" role="status">
          {notice}
        </p>
      ) : null}
      {view === 'welcome' ? (
        <Welcome onGetStarted={startSetup} onLogoClick={goHome} />
      ) : null}
      {view === 'setup' ? (
        <SetupForm
          profile={profile}
          onChange={setProfile}
          onComplete={completeSetup}
          onLogoClick={goHome}
        />
      ) : null}
      {view === 'profile' ? (
        <ProfileView
          key={profile.lastUpdated ?? 'profile'}
          profile={profile}
          onSave={saveEdits}
          onReset={resetProfile}
          onLiveChange={setProfile}
          onLogoClick={goHome}
        />
      ) : null}
    </AppShell>
  )
}

export default App
