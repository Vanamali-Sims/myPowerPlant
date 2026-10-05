/**
 * Shared chrome for Actions and What if dock panels (header, subtitle, tabs, body).
 */
import type { ReactNode } from 'react'

export type TrayTab<T extends string> = { id: T; label: string }

type Props<T extends string> = {
  sectionId: string
  sectionLabel: string
  panelClassName?: string
  title: string
  badge?: ReactNode
  subtitle: string
  tabs: readonly TrayTab<T>[]
  activeTab: T
  onTabChange: (id: T) => void
  tabsAriaLabel: string
  status: string
  statusId?: string
  showStatus?: boolean
  onClose: () => void
  closeLabel: string
  bodyClassName?: string
  busy?: boolean
  children: ReactNode
}

export function TrayPanelCloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="chat-panel__close" onClick={onClick} aria-label={label}>
      <span aria-hidden="true">×</span>
    </button>
  )
}

/**
 * TrayPanelLayout
 */
export function TrayPanelLayout<T extends string>({
  sectionId,
  sectionLabel,
  panelClassName = '',
  title,
  badge,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  tabsAriaLabel,
  status,
  statusId,
  showStatus = true,
  onClose,
  closeLabel,
  bodyClassName = '',
  busy,
  children,
}: Props<T>) {
  return (
    <section
      id={sectionId}
      className={`chat-panel chat-panel--tray ${panelClassName}`.trim()}
      aria-label={sectionLabel}
      aria-busy={busy}
    >
      <header className="chat-panel__head">
        {badge ? (
          <div className="chat-panel__title-wrap">
            <h2 className="chat-panel__title">{title}</h2>
            {badge}
          </div>
        ) : (
          <h2 className="chat-panel__title">{title}</h2>
        )}
        <TrayPanelCloseButton onClick={onClose} label={closeLabel} />
      </header>
      <p className="chat-panel__notice">{subtitle}</p>
      <div className="chat-actions__tabs" role="tablist" aria-label={tabsAriaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`chat-actions__tab${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="chat-panel__main">
        {showStatus ? (
          <p id={statusId} className="chat-panel__status" role="status" aria-live="polite">
            {status}
          </p>
        ) : null}
        <div className={`chat-panel__body ${bodyClassName}`.trim()}>{children}</div>
      </div>
    </section>
  )
}
