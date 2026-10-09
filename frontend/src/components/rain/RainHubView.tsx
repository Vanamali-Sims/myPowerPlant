import type { ReactNode } from 'react'
import { RAIN_HUB } from '../../constants/onboarding'
import { MyPowerPlantMark } from '../ui/MyPowerPlantMark'

type HubTarget = 'whatif' | 'goals' | 'reminders'

type Props = {
  onNavigate: (target: HubTarget) => void
}

/**
 * Screen 3.1 — Rain hub with three tool cards (dark band layout).
 */
export function RainHubView({ onNavigate }: Props) {
  return (
    <div className="rain-hub">
      <header className="rain-hub__header">
        <span className="rain-hub__avatar" aria-hidden="true">
          <MyPowerPlantMark width={28} height={28} />
        </span>
        <h1>{RAIN_HUB.title}</h1>
      </header>

      <div className="rain-hub__grid">
        <HubCard
          preview={<WhatIfPreview />}
          title={RAIN_HUB.cards.whatif.title}
          body={RAIN_HUB.cards.whatif.body}
          action={RAIN_HUB.cards.whatif.action}
          onClick={() => onNavigate('whatif')}
        />
        <HubCard
          preview={<GoalsPreview />}
          title={RAIN_HUB.cards.goals.title}
          body={RAIN_HUB.cards.goals.body}
          action={RAIN_HUB.cards.goals.action}
          onClick={() => onNavigate('goals')}
        />
        <HubCard
          preview={<RemindersPreview />}
          title={RAIN_HUB.cards.reminders.title}
          body={RAIN_HUB.cards.reminders.body}
          action={RAIN_HUB.cards.reminders.action}
          onClick={() => onNavigate('reminders')}
        />
      </div>
    </div>
  )
}

type CardProps = {
  preview: ReactNode
  title: string
  body: string
  action: string
  onClick: () => void
}

function HubCard({ preview, title, body, action, onClick }: CardProps) {
  return (
    <article className="rain-hub__card">
      <div className="rain-hub__preview">{preview}</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" className="rain-hub__link" onClick={onClick}>
        {action} →
      </button>
    </article>
  )
}

function WhatIfPreview() {
  return (
    <svg viewBox="0 0 200 100" className="rain-hub__svg" aria-hidden="true">
      <rect width="200" height="100" rx="8" fill="#0d211a" />
      <polyline
        points="16,72 48,58 80,64 112,42 148,48 184,28"
        fill="none"
        stroke="#de6a34"
        strokeWidth="2.5"
      />
      <polyline
        points="16,78 48,70 80,74 112,58 148,62 184,48"
        fill="none"
        stroke="#a3bca9"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.7"
      />
      <rect x="24" y="82" width="152" height="4" rx="2" fill="#163529" />
      <rect x="72" y="82" width="48" height="4" rx="2" fill="#de6a34" />
    </svg>
  )
}

function GoalsPreview() {
  return (
    <svg viewBox="0 0 200 100" className="rain-hub__svg" aria-hidden="true">
      <rect width="200" height="100" rx="8" fill="#0d211a" />
      <circle cx="56" cy="50" r="28" fill="none" stroke="#163529" strokeWidth="8" />
      <circle
        cx="56"
        cy="50"
        r="28"
        fill="none"
        stroke="#de6a34"
        strokeWidth="8"
        strokeDasharray="120 176"
        transform="rotate(-90 56 50)"
      />
      <text x="96" y="44" fill="#f4f1e8" fontSize="9" fontFamily="system-ui">
        ANNUAL TARGET
      </text>
      <text x="96" y="58" fill="#de6a34" fontSize="11" fontWeight="600" fontFamily="system-ui">
        $408 of $600
      </text>
      <text x="96" y="72" fill="#a3bca9" fontSize="8" fontFamily="system-ui">
        On track for March
      </text>
    </svg>
  )
}

function RemindersPreview() {
  return (
    <svg viewBox="0 0 200 100" className="rain-hub__svg" aria-hidden="true">
      <rect width="200" height="100" rx="8" fill="#0d211a" />
      <rect x="20" y="22" width="160" height="28" rx="6" fill="#14312a" stroke="#1f4a3c" />
      <text x="32" y="40" fill="#f4f1e8" fontSize="8" fontFamily="system-ui">
        Peak event tonight · keep 20% reserve
      </text>
      <rect x="28" y="58" width="152" height="26" rx="6" fill="#14312a" stroke="#1f4a3c" opacity="0.85" />
      <text x="40" y="74" fill="#a3bca9" fontSize="8" fontFamily="system-ui">
        Bill due in 3 days
      </text>
    </svg>
  )
}
