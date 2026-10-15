/**
 * Logged-in chrome: dark icon rail and wordmark.
 */
import type { ReactNode } from 'react'
import {
  MATT_NAV,
  PATH_RAIL_ITEM,
  PROFILE_RAIL_ITEM,
  RAIN_NAV,
  RAIN_PROFILE_RAIL_ITEM,
  TUTORIAL_TARGETS,
  type AppNavId,
  type NavItem,
} from '../../constants'
import type { UserJourney } from '../../lib/journeyStorage'
import { useSlidingHighlight } from '../../lib/useSlidingHighlight'
import { useTransientPopover } from '../../lib/useTransientPopover'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'
import { Popover } from '../ui/Popover'
export type { AppNavId }

type Props = {
  journey: UserJourney
  active: AppNavId | null
  showRail: boolean
  hasProfile: boolean
  /** Rain improve flow: What if, Goals, and Reminders unlock after setup is complete. */
  featuresReady?: boolean
  onNavigate: (id: AppNavId) => void
  onLogoClick: () => void
  onOpenPathControls?: () => void
  children: ReactNode
  chat?: ReactNode
}

/**
 * AppShell
 * @param props.journey - Matt or Rain navigation set
 * @param props.showRail - False on Rain hub (cards only)
 * @returns JSX.Element
 */
export function AppShell({
  journey,
  active,
  showRail,
  hasProfile,
  featuresReady = true,
  onNavigate,
  onLogoClick,
  onOpenPathControls,
  children,
  chat,
}: Props) {
  const profileItem = journey === 'rain' ? RAIN_PROFILE_RAIL_ITEM : PROFILE_RAIL_ITEM
  const nav = journey === 'rain' ? RAIN_NAV : MATT_NAV
  const [openPopover, setOpenPopover] = useTransientPopover()
  const { setRef: setNavRef, box: navBox } = useSlidingHighlight(active, '.app-rail__item.is-active')

  function isImproveFeature(id: AppNavId) {
    return id === 'whatif' || id === 'goals' || id === 'reminders'
  }

  function isFeatureLocked(id: AppNavId) {
    return journey === 'rain' && !featuresReady && isImproveFeature(id)
  }

  function isAvailable(id: AppNavId) {
    if (journey === 'rain') {
      if (isImproveFeature(id)) return featuresReady
      return true
    }
    if (id === 'path') return true
    if (id === 'home' || id === 'dashboard' || id === 'recommendations') return true
    return hasProfile
  }

  function handleClick(item: NavItem) {
    if (item.id === 'path') {
      if (!onOpenPathControls) return
      setOpenPopover(null)
      onOpenPathControls()
      return
    }
    if (isFeatureLocked(item.id)) {
      setOpenPopover(null)
      onNavigate(item.id)
      return
    }
    if (!isAvailable(item.id)) {
      setOpenPopover(item.id)
      return
    }
    setOpenPopover(null)
    onNavigate(item.id)
  }

  /** Rail items the tutorial points at: Role, and the improve features as one group. */
  function tourTarget(id: AppNavId) {
    if (id === 'path') return TUTORIAL_TARGETS.path
    if (journey === 'rain' && (id === 'whatif' || id === 'goals' || id === 'reminders')) {
      return TUTORIAL_TARGETS.features
    }
    return undefined
  }

  function renderRailItem(item: NavItem, activeId: AppNavId | null) {
    const Icon = item.icon
    const locked = isFeatureLocked(item.id)
    const available = isAvailable(item.id)
    return (
      <div key={item.id} className="popover-anchor app-rail__item-wrap">
        <button
          type="button"
          className={`app-rail__item${activeId === item.id ? ' is-active' : ''}${
            available ? '' : ' is-unavailable'
          }${locked ? ' is-locked' : ''}`}
          onClick={() => handleClick(item)}
          aria-current={activeId === item.id ? 'page' : undefined}
          aria-disabled={!available && !locked}
          title={locked ? item.unavailableMessage : available ? item.label : item.unavailableMessage}
          data-tour={tourTarget(item.id)}
        >
          <Icon />
          {item.label}
        </button>
        <Popover open={openPopover === item.id} message={item.unavailableMessage} placement="right" />
      </div>
    )
  }

  return (
    <div className={`app-shell${showRail ? '' : ' app-shell--no-rail'}`}>
      {showRail ? (
        <aside className="app-rail" aria-label="App">
          <button
            type="button"
            className="brand brand--inverse brand--button"
            onClick={onLogoClick}
            aria-label="MyPowerPlant home"
          >
            <span className="brand__mark brand__mark--logo">
              <MyPowerPlantMark width={28} height={28} />
            </span>
            <span className="brand__word">MyPowerPlant</span>
          </button>
          <nav ref={setNavRef} className="app-rail__nav">
            <span
              aria-hidden="true"
              className={`app-rail__highlight${navBox.visible ? ' is-visible' : ''}${
                navBox.ready ? ' is-ready' : ''
              }`}
              style={{
                transform: `translate3d(0, ${navBox.top}px, 0)`,
                height: navBox.height,
              }}
            />
            {nav.map((item) => renderRailItem(item, active))}
          </nav>
          <div className="app-rail__footer">
            {renderRailItem(profileItem, active)}
            {onOpenPathControls ? renderRailItem(PATH_RAIL_ITEM, active) : null}
          </div>
        </aside>
      ) : null}
      <div className="app-shell__main">
        {children}
        {chat}
      </div>
    </div>
  )
}
