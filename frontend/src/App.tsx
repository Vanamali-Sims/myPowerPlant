/**
 * Client-side view router: onboarding, Matt (explore VPP), and Rain (improve setup).
 */
import { Suspense, lazy, useEffect, useState } from 'react'
import { AppShell, type AppNavId } from './components/layout/AppShell'
import { ChatDock } from './components/chat/ChatDock'
import { DashboardView } from './components/dashboard/DashboardView'
import { Welcome } from './components/home/Welcome'
import { ImproveHome } from './components/improve/ImproveHome'
import { ImproveProfileView } from './components/improve/ImproveProfileView'
import { ImproveSetupForm } from './components/improve/ImproveSetupForm'
import { FlowControls } from './components/onboarding/FlowControls'
import { FlowControlsDialog } from './components/onboarding/FlowControlsDialog'
import { ExploreIntro } from './components/onboarding/ExploreIntro'
import { IntroChoiceScreen } from './components/onboarding/IntroChoiceScreen'
import { ProfileView } from './components/profile/ProfileView'
import { RecommendationsView } from './components/recommendations/RecommendationsView'
import { RemindersView } from './components/reminders/RemindersView'
import { SetupForm } from './components/setup/SetupForm'
import { CustomCursor } from './components/ui/CustomCursor'
import { StickyHover } from './components/ui/StickyHover'
import { WhatIfView } from './components/whatif/WhatIfView'
import { fetchMethodology, type MethodologyBundle } from './lib/methodologyApi'
import type { Timeframe } from './lib/kpis'
import { DEFAULT_EVENT_TYPE, DEFAULT_REMINDER_PERIOD_DAYS, type ImproveFeatureId } from './constants'
import { clearAllDeviceData } from './lib/deviceReset'
import { clearGoals } from './lib/goals/goalsStorage'
import { isImproveReady, prefilledFromExplore, resetImproveAnswers } from './lib/improveProfile'
import { loadJourney, saveJourney, type UserJourney } from './lib/journeyStorage'
import { clearStoredProfile, loadProfile, saveProfile, storeProfile } from './lib/profileStorage'
import { clearReminders } from './lib/reminderStorage'
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
  | 'improveSetup'
  | 'improveProfile'
  | 'whatif'
  | 'reminders'
  | 'goals'

const GoalsView = lazy(() =>
  import('./components/goals/GoalsView').then((module) => ({ default: module.GoalsView })),
)

function initialView(): View {
  const saved = loadJourney()
  if (saved === 'matt') return 'dashboard'
  if (saved === 'rain') return 'rainHub'
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
  /** The story intro over the explore home: a new run each time it starts, and whether it is showing. */
  const [exploreIntroRun, setExploreIntroRun] = useState(0)
  const [exploreIntroPlaying, setExploreIntroPlaying] = useState(false)
  /** Feature to open once the access-features form is saved. */
  const [pendingFeature, setPendingFeature] = useState<ImproveFeatureId | null>(null)
  /** Whether the access-features form opened with answers from the explore form. */
  const [improvePrefilled, setImprovePrefilled] = useState(false)

  const hasProfile = Boolean(profile.lastUpdated)
  const rainJourney = journey === 'rain'
  const improveReady = isImproveReady(profile)

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
      setView('rainHub')
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

  // Switching flows keeps the answers: both flows share one profile, and
  // whichever changed it last is what the other sees. Reset device still wipes.
  function beginExploreJourney() {
    saveJourney('matt')
    setJourney('matt')
    setView('welcome')
    setNotice('')
  }

  // Picking "Get started with VPPs" plays the story of how a VPP works over the explore home.
  function chooseExplore() {
    beginExploreJourney()
    setExploreIntroRun((run) => run + 1)
    setExploreIntroPlaying(true)
  }

  function beginImproveJourney() {
    saveJourney('rain')
    setJourney('rain')
    setView('rainHub')
    setNotice('')
  }

  function enrollAsImprove(vppProvider: string) {
    clearGoals()
    const next = saveProfile({ ...profile, vppProvider }, 'improve')
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
    const saved = saveProfile(next, rainJourney ? 'improve' : 'explore')
    setProfile(saved)
  }

  function startImproveSetup(feature: ImproveFeatureId | null = null) {
    setImprovePrefilled(prefilledFromExplore(profile))
    setPendingFeature(feature)
    setView('improveSetup')
    setNotice('')
  }

  /** Opens a feature, or the access-features form first when answers are missing. */
  function openFeature(feature: ImproveFeatureId) {
    if (!improveReady) {
      startImproveSetup(feature)
      return
    }
    setView(feature)
    setNotice('')
  }

  function completeImproveSetup(next: ProfileData) {
    const saved = saveProfile(next, 'improve')
    setProfile(saved)
    setView(pendingFeature ?? 'rainHub')
    setPendingFeature(null)
    setNotice('')
  }

  function resetImproveProfile() {
    setProfile(storeProfile(resetImproveAnswers(profile)))
    clearGoals()
    clearReminders()
    setView('rainHub')
    setNotice('Your improve profile was reset.')
  }

  function exitImproveSetup() {
    // Unsaved edits stay out of storage: reload what was last saved.
    setProfile(loadProfile())
    setPendingFeature(null)
    setView('rainHub')
    setNotice('')
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
      if (id === 'whatif' || id === 'goals' || id === 'reminders') {
        openFeature(id)
        return
      }
      if (id === 'home') setView('rainHub')
      else if (id === 'profile') setView('improveProfile')
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
    if (view === 'profile' || view === 'improveProfile') return 'profile'
    if (view === 'welcome' || view === 'rainHub') return 'home'
    if (view === 'recommendations') return 'recommendations'
    if (view === 'whatif') return 'whatif'
    if (view === 'reminders') return 'reminders'
    if (view === 'goals') return 'goals'
    return null
  }

  const showShell = view !== 'intro' && view !== 'pathChoice'
  const showRail = showShell && (journey === 'matt' || journey === 'rain')
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
        (view === 'rainHub' ||
          view === 'improveSetup' ||
          view === 'improveProfile' ||
          view === 'whatif' ||
          view === 'goals' ||
          view === 'reminders')))

  // Screens 1 and 2 are one screen: the intro plays over the choice. The same
  // element is returned for every case so the choice is not remounted when the
  // intro hands over to it.
  if (view === 'intro' || view === 'pathChoice' || !journey) {
    return (
      <>
        <CustomCursor />
        <StickyHover />
        <IntroChoiceScreen
          playIntro={view === 'intro'}
          onIntroDone={finishIntro}
          onExplore={chooseExplore}
          onImprove={beginImproveJourney}
        />
      </>
    )
  }

  return (
    <>
      <CustomCursor />
      <StickyHover />
      {/* The page under the story intro stays out of reach until it ends. */}
      <div className="app-under-intro" inert={(exploreIntroPlaying && view === 'welcome') || undefined}>
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
              <ImproveHome
                profile={profile}
                bundle={bundle}
                onOpenForm={() => startImproveSetup()}
                onOpenFeature={openFeature}
                onLogoClick={goHome}
              />
            ) : null}
            {rainJourney && view === 'improveSetup' ? (
              <ImproveSetupForm
                profile={profile}
                bundle={bundle}
                prefilled={improvePrefilled}
                onChange={setProfile}
                onComplete={completeImproveSetup}
                onExit={exitImproveSetup}
                onLogoClick={goHome}
              />
            ) : null}
            {rainJourney && view === 'improveProfile' ? (
              <ImproveProfileView
                key={profile.improveUpdated ?? 'improve-profile'}
                profile={profile}
                bundle={bundle}
                onSave={saveEdits}
                onReset={resetImproveProfile}
                onLogoClick={goHome}
              />
            ) : null}
            {rainJourney && view === 'whatif' ? (
              <WhatIfView
                profile={profile}
                hasProfile={improveReady}
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
                  onLogoClick={goHome}
                />
              </Suspense>
            ) : null}
          </div>
        </AppShell>
      </div>
      {exploreIntroRun > 0 && view === 'welcome' ? (
        <ExploreIntro
          key={exploreIntroRun}
          onDone={() => setExploreIntroPlaying(false)}
          focusAfter={() => document.getElementById('welcome-hero-title')}
        />
      ) : null}
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
