/**
 * Client-side view router: welcome, setup, profile, and dashboard.
 */
import { useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { DashboardView } from './components/dashboard/DashboardView'
import { Welcome } from './components/home/Welcome'
import { ProfileView } from './components/profile/ProfileView'
import { RemindersView } from './components/reminders/RemindersView'
import { SetupForm } from './components/setup/SetupForm'
import { CustomCursor } from './components/ui/CustomCursor'
import { StickyHover } from './components/ui/StickyHover'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { emptyProfile, type ProfileData } from './types/profile'

type View = 'welcome' | 'setup' | 'profile' | 'dashboard' | 'reminders'

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
    if (id === 'dashboard') {
      setView('dashboard')
      setNotice('')
      return
    }
    if (id === 'reminders') {
      setView('reminders')
      setNotice('')
    }
  }

  return (
    <>
      <CustomCursor />
      <StickyHover />
      <AppShell
        active={
          view === 'dashboard'
            ? 'dashboard'
            : view === 'profile'
              ? 'profile'
              : view === 'reminders'
                ? 'reminders'
                : view === 'welcome'
                  ? 'home'
                  : null
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
        <div key={view} className="view-enter min-h-full">
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
              hasProfile={Boolean(profile.lastUpdated)}
              onEditProfile={() => {
                setView('profile')
                setNotice('')
              }}
              onStartSetup={startSetup}
              onLogoClick={goHome}
            />
          ) : null}
          {view === 'reminders' ? <RemindersView profile={profile} onLogoClick={goHome} /> : null}
        </div>
      </AppShell>
    </>
  )
}

export default App
