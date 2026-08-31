import { useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { ProfileView } from './components/profile/ProfileView'
import { SetupForm } from './components/setup/SetupForm'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { emptyProfile, type ProfileData } from './types/profile'
import './App.css'

type View = 'setup' | 'profile'

function App() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  const [view, setView] = useState<View>(() =>
    loadProfile().lastUpdated ? 'profile' : 'setup',
  )
  const [notice, setNotice] = useState('')

  function completeSetup(next: ProfileData) {
    const saved = saveProfile(next)
    setProfile(saved)
    setView('profile')
    setNotice('')
  }

  function saveEdits(next: ProfileData) {
    const saved = saveProfile(next)
    setProfile(saved)
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
      return
    }
    setNotice(
      id === 'home'
        ? 'Home isn’t set up yet. You can keep using your profile.'
        : 'Dashboard isn’t set up yet. You can keep using your profile.',
    )
  }

  return (
    <AppShell
      active={view === 'profile' ? 'profile' : null}
      postcode={profile.postcode}
      onNavigate={goTo}
    >
      {notice ? (
        <p className="app-notice" role="status">
          {notice}
        </p>
      ) : null}
      {view === 'setup' ? (
        <SetupForm
          profile={profile}
          onChange={setProfile}
          onComplete={completeSetup}
        />
      ) : (
        <ProfileView
          key={profile.lastUpdated ?? 'profile'}
          profile={profile}
          onSave={saveEdits}
          onReset={resetProfile}
          onLiveChange={setProfile}
        />
      )}
    </AppShell>
  )
}

export default App
