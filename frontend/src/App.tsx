/**
 * Client-side view router: welcome, setup, profile, and dashboard.
 */
import { useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { DashboardView } from './components/dashboard/DashboardView'
import { Welcome } from './components/home/Welcome'
import { ProfileView } from './components/profile/ProfileView'
import { SetupForm } from './components/setup/SetupForm'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { emptyProfile, type ProfileData } from './types/profile'

type View = 'welcome' | 'setup' | 'profile' | 'dashboard'

/**
 * App
 * @returns JSX.Element
 *
 * Holds the in-memory profile and which screen is showing.
 * localStorage is the only persistence — no data leaves the device.
 */
function App() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  const [view, setView] = useState<View>('welcome')
  const [notice, setNotice] = useState('')

  function startSetup() {
    setView('setup')
    setNotice('')
  }

  function goHome() {
    setView('welcome')
    setNotice('')
  }

  function completeSetup(next: ProfileData) {
    const saved = saveProfile(next)
    setProfile(saved)
    setView('dashboard')
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
    if (id === 'home') {
      setView('welcome')
      setNotice('')
      return
    }
    if (id === 'profile') {
      setView('profile')
      setNotice('')
      return
    }
    if (id === 'dashboard' && profile.lastUpdated) {
      setView('dashboard')
      setNotice('')
    }
  }

  return (
    <AppShell
      active={
        view === 'dashboard' ? 'dashboard' : view === 'profile' ? 'profile' : view === 'welcome' ? 'home' : null
      }
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
        <Welcome
          hasProfile={Boolean(profile.lastUpdated)}
          onGetStarted={startSetup}
          onViewDashboard={() => {
            setView('dashboard')
            setNotice('')
          }}
          onLogoClick={goHome}
        />
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
          onViewDashboard={() => {
            setView('dashboard')
            setNotice('')
          }}
        />
      ) : null}
      {view === 'dashboard' ? (
        <DashboardView
          profile={profile}
          onEditProfile={() => {
            setView('profile')
            setNotice('')
          }}
          onLogoClick={goHome}
        />
      ) : null}
    </AppShell>
  )
}

export default App
