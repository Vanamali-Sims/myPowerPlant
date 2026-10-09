/**
 * Client-side view router: onboarding, Matt (explore VPP), and Rain (improve setup).
 */
import { Suspense, lazy, useEffect, useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { ChatDock } from './components/chat/ChatDock'
import { DashboardView } from './components/dashboard/DashboardView'
import { Welcome } from './components/home/Welcome'
import { FlowControls } from './components/onboarding/FlowControls'
import { FlowControlsDialog } from './components/onboarding/FlowControlsDialog'
import { PathChoiceScreen } from './components/onboarding/PathChoiceScreen'
import { VppIntroScreen } from './components/onboarding/VppIntroScreen'
import { ProfileView } from './components/profile/ProfileView'
import { RecommendationsView } from './components/recommendations/RecommendationsView'
import { RainHubView } from './components/rain/RainHubView'
import { RemindersView } from './components/reminders/RemindersView'
import { SetupForm } from './components/setup/SetupForm'
import { CustomCursor } from './components/ui/CustomCursor'
import { StickyHover } from './components/ui/StickyHover'
import { WhatIfView } from './components/whatif/WhatIfView'
import { fetchMethodology, type MethodologyBundle } from './lib/methodologyApi'
import type { Timeframe } from './lib/kpis'
import { DEFAULT_EVENT_TYPE, DEFAULT_REMINDER_PERIOD_DAYS } from './constants'
import { clearAllDeviceData } from './lib/deviceReset'
import { clearGoals } from './lib/goals/goalsStorage'
import { loadJourney, saveJourney, type UserJourney } from './lib/journeyStorage'
import { clearStoredProfile, loadProfile, saveProfile } from './lib/profileStorage'
import { emptyProfile, type ProfileData, type SetupStepId } from './types/profile'
import type { EventType } from './types/reminders'

type View =
  | 'intro'
  | 'pathChoice'
  | 'welcome'
  | 'setup'
  | 'profile'
  | 'dashboard'
  | 'recommendations'
  | 'rainHub'
  | 'whatif'
  | 'reminders'
  | 'goals'

const GoalsView = lazy(() =>
  import('./components/goals/GoalsView').then((module) => ({ default: module.GoalsView })),
)

function initialView(): View {
  if (import.meta.env.MODE === 'test') {
    const saved = loadJourney()
    if (saved === 'matt') return 'dashboard'
    if (saved === 'rain') return 'goals'
  }
  return 'intro'
}

function App() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  const [journey, setJourney] = useState<UserJourney | null>(loadJourney)
  const [view, setView] = useState<View>(initialView)
  const [notice, setNotice] = useState('')
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly')
  const [bundle, setBundle] = useState<MethodologyBundle | null>(null)
  const [methodologyError, setMethodologyError] = useState('')
  const [eventType, setEventType] = useState<EventType>(DEFAULT_EVENT_TYPE)
  const [reminderPeriodDays, setReminderPeriodDays] = useState(DEFAULT_REMINDER_PERIOD_DAYS)
  const [, setSetupStepId] = useState<SetupStepId | null>(null)
  const [flowControlsOpen, setFlowControlsOpen] = useState(false)

  const hasProfile = Boolean(profile.lastUpdated)
  const rainJourney = journey === 'rain'

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

  function finishIntro() {
    const saved = loadJourney()
    setJourney(saved)
    if (saved === 'matt') {
      setView('dashboard')
      setNotice('')
      return
    }
    if (saved === 'rain') {
      setView('goals')
      setNotice('')
      return
    }
    setView('pathChoice')
    setNotice('')
  }

  function wipeLocalAppState() {
    clearAllDeviceData()
    setProfile(emptyProfile())
  }

  function beginExploreJourney() {
    wipeLocalAppState()
    saveJourney('matt')
    setJourney('matt')
    setView('welcome')
    setNotice('')
  }

  function beginImproveJourney() {
    wipeLocalAppState()
    saveJourney('rain')
    setJourney('rain')
    setView('rainHub')
    setNotice('')
  }

  function enrollAsImprove(provider: string) {
    clearGoals()
    const next = saveProfile({ ...profile, provider })
    setProfile(next)
    saveJourney('rain')
    setJourney('rain')
    setView('rainHub')
    setNotice('')
  }

  function startSetup() {
    setView('setup')
    setNotice('')
    setSetupStepId('household')
  }

  function goHome() {
    if (rainJourney) {
      setView('rainHub')
    } else {
      setView('welcome')
    }
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

  function resetDeviceData() {
    wipeLocalAppState()
    setJourney(null)
    setView('intro')
    setNotice('')
  }

  function closeFlowControls() {
    setFlowControlsOpen(false)
  }

  const flowControlHandlers = {
    onSwitchToExplore: () => {
      closeFlowControls()
      beginExploreJourney()
    },
    onSwitchToImprove: () => {
      closeFlowControls()
      beginImproveJourney()
    },
    onResetDevice: () => {
      closeFlowControls()
      resetDeviceData()
    },
  }

  function goTo(id: AppNavId) {
    if (rainJourney) {
      if (id === 'whatif') setView('whatif')
      else if (id === 'goals') setView('goals')
      else if (id === 'reminders') setView('reminders')
      setNotice('')
      return
    }

    if (id === 'home') setView('welcome')
    else if (id === 'profile') setView('profile')
    else if (id === 'dashboard') setView('dashboard')
    else if (id === 'recommendations') setView('recommendations')
    setNotice('')
  }

  function shellActive(): AppNavId | null {
    if (view === 'dashboard') return 'dashboard'
    if (view === 'profile') return 'profile'
    if (view === 'welcome') return 'home'
    if (view === 'recommendations') return 'recommendations'
    if (view === 'whatif') return 'whatif'
    if (view === 'reminders') return 'reminders'
    if (view === 'goals') return 'goals'
    return null
  }

  const showShell = view !== 'intro' && view !== 'pathChoice'
  const showRail =
    showShell && (rainJourney ? view !== 'rainHub' : true) && (journey === 'matt' || journey === 'rain')
  const showChat = showShell && !rainJourney && journey === 'matt'
  const showPathRail =
    showRail &&
    ((journey === 'matt' &&
      (view === 'welcome' ||
        view === 'setup' ||
        view === 'dashboard' ||
        view === 'recommendations' ||
        view === 'profile')) ||
      (journey === 'rain' &&
        (view === 'whatif' || view === 'goals' || view === 'reminders')))

  if (view === 'intro') {
    return (
      <>
        <CustomCursor />
        <StickyHover />
        <VppIntroScreen onComplete={finishIntro} />
      </>
    )
  }

  if (view === 'pathChoice') {
    return (
      <>
        <CustomCursor />
        <StickyHover />
        <PathChoiceScreen onExplore={beginExploreJourney} onImprove={beginImproveJourney} />
      </>
    )
  }

  if (!journey) {
    return (
      <>
        <CustomCursor />
        <StickyHover />
        <PathChoiceScreen onExplore={beginExploreJourney} onImprove={beginImproveJourney} />
      </>
    )
  }

  return (
    <>
      <CustomCursor />
      <StickyHover />
      <AppShell
        journey={journey}
        showRail={showRail}
        active={shellActive()}
        postcode={profile.postcode}
        hasProfile={hasProfile}
        onNavigate={goTo}
        onLogoClick={goHome}
        onOpenPathControls={showPathRail ? () => setFlowControlsOpen(true) : undefined}
        chat={
          showChat ? (
            <ChatDock
              profile={profile}
              hasProfile={hasProfile}
              bundle={bundle}
              methodologyError={methodologyError}
              eventType={eventType}
              reminderPeriodDays={reminderPeriodDays}
              onSaveProfile={saveEdits}
            />
          ) : null
        }
      >
        {notice ? (
          <p className="app-notice" role="status">
            {notice}
          </p>
        ) : null}
        <div key={view} className="view-enter min-h-full">
          {!rainJourney && view === 'welcome' ? (
            <Welcome
              hasProfile={hasProfile}
              onGetStarted={startSetup}
              onViewDashboard={() => {
                setView('dashboard')
                setNotice('')
              }}
              onLogoClick={goHome}
            />
          ) : null}
          {!rainJourney && view === 'setup' ? (
            <SetupForm
              profile={profile}
              onChange={setProfile}
              onComplete={completeSetup}
              onLogoClick={goHome}
              onStepChange={setSetupStepId}
            />
          ) : null}
          {!rainJourney && view === 'profile' ? (
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
          {!rainJourney && view === 'dashboard' ? (
            <DashboardView
              profile={profile}
              hasProfile={hasProfile}
              bundle={bundle}
              loadError={methodologyError}
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              onEditProfile={() => {
                setView('profile')
                setNotice('')
              }}
              onStartSetup={startSetup}
              onSeeRecommendations={() => {
                setView('recommendations')
                setNotice('')
              }}
              onLogoClick={goHome}
            />
          ) : null}
          {!rainJourney && view === 'recommendations' ? (
            <RecommendationsView
              profile={profile}
              hasProfile={hasProfile}
              bundle={bundle}
              loadError={methodologyError}
              onStartSetup={startSetup}
              onEnrollProvider={enrollAsImprove}
              onLogoClick={goHome}
            />
          ) : null}
          {rainJourney && view === 'rainHub' ? (
            <div className="rain-hub-page">
              <RainHubView
                onNavigate={(target) => {
                  setView(target)
                  setNotice('')
                }}
              />
              <div className="flow-controls-wrap">
                <FlowControls variant="improve" improvePlacement="hub" embedded {...flowControlHandlers} />
              </div>
            </div>
          ) : null}
          {rainJourney && view === 'whatif' ? (
            <WhatIfView
              profile={profile}
              hasProfile={hasProfile}
              bundle={bundle}
              methodologyError={methodologyError}
              onSaveProfile={saveEdits}
              onStartSetup={startSetup}
              onLogoClick={goHome}
              hideSetupNavigation
            />
          ) : null}
          {rainJourney && view === 'reminders' ? (
            <RemindersView
              profile={profile}
              onLogoClick={goHome}
              eventType={eventType}
              onEventType={setEventType}
              reminderPeriodDays={reminderPeriodDays}
              onReminderPeriodDays={setReminderPeriodDays}
            />
          ) : null}
          {rainJourney && view === 'goals' ? (
            <Suspense
              fallback={
                <p className="goals__loading" role="status">
                  Loading goals…
                </p>
              }
            >
              <GoalsView
                profile={profile}
                bundle={bundle}
                methodologyError={methodologyError}
                onOpenProfile={() => undefined}
                onStartSetup={startSetup}
                onLogoClick={goHome}
                hideProfileNavigation
              />
            </Suspense>
          ) : null}
        </div>
      </AppShell>
      <FlowControlsDialog open={flowControlsOpen} onClose={closeFlowControls}>
        <FlowControls
          variant={journey === 'rain' ? 'improve' : 'explore'}
          improvePlacement="dialog"
          embedded
          {...flowControlHandlers}
        />
      </FlowControlsDialog>
    </>
  )
}

export default App
