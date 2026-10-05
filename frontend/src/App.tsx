/**
 * Client-side view router: welcome, setup, profile, and dashboard.
 */
import { useEffect, useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { ChatDock } from './components/chat/ChatDock'
import { DashboardView } from './components/dashboard/DashboardView'
import { Welcome } from './components/home/Welcome'
import { ProfileView } from './components/profile/ProfileView'
import { RemindersView } from './components/reminders/RemindersView'
import { SetupForm } from './components/setup/SetupForm'
import { CustomCursor } from './components/ui/CustomCursor'
import { StickyHover } from './components/ui/StickyHover'
import { fetchMethodology, type MethodologyBundle } from './lib/methodologyApi'
import type { Timeframe } from './lib/kpis'
import { DEFAULT_EVENT_TYPE, DEFAULT_REMINDER_PERIOD_DAYS } from './constants'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { emptyProfile, type ProfileData, type SetupStepId } from './types/profile'
import type { EventType } from './types/reminders'

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
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly')
  const [bundle, setBundle] = useState<MethodologyBundle | null>(null)
  const [methodologyError, setMethodologyError] = useState('')
  const [eventType, setEventType] = useState<EventType>(DEFAULT_EVENT_TYPE)
  const [reminderPeriodDays, setReminderPeriodDays] = useState(DEFAULT_REMINDER_PERIOD_DAYS)
  const [, setSetupStepId] = useState<SetupStepId | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchMethodology().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setBundle(result.data)
        setMethodologyError('')
      } else {
        setMethodologyError(result.error)
        setBundle(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function startSetup() {
    setView('setup')
    setNotice('')
    setSetupStepId('household')
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
        chat={
          <ChatDock
            profile={profile}
            hasProfile={Boolean(profile.lastUpdated)}
            bundle={bundle}
            methodologyError={methodologyError}
            eventType={eventType}
            reminderPeriodDays={reminderPeriodDays}
            onSaveProfile={saveEdits}
          />
        }
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
              onStepChange={setSetupStepId}
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
              bundle={bundle}
              loadError={methodologyError}
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              onEditProfile={() => {
                setView('profile')
                setNotice('')
              }}
              onStartSetup={startSetup}
              onLogoClick={goHome}
            />
          ) : null}
          {view === 'reminders' ? (
            <RemindersView
              profile={profile}
              onLogoClick={goHome}
              eventType={eventType}
              onEventType={setEventType}
              reminderPeriodDays={reminderPeriodDays}
              onReminderPeriodDays={setReminderPeriodDays}
            />
          ) : null}
        </div>
      </AppShell>
    </>
  )
}

export default App
