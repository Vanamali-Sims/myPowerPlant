import { useState } from 'react'
import { IMPROVE_FEATURES, type ImproveFeatureId } from '../../constants/improve'
import { LockIcon } from '../ui/icons'

type Props = {
  locked?: boolean
  onOpenFeature: (id: ImproveFeatureId) => void
}

function FeatureArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WhatIfPreview() {
  return (
    <div className="feature-preview feature-preview--whatif">
      <div className="feature-preview__sliders">
        <div className="feature-preview__slider">
          <span className="feature-preview__slider-label">Battery</span>
          <div className="feature-preview__track">
            <span className="feature-preview__knob" />
          </div>
        </div>
        <div className="feature-preview__slider">
          <span className="feature-preview__slider-label">Panels</span>
          <div className="feature-preview__track">
            <span className="feature-preview__knob" />
          </div>
        </div>
      </div>
      <div className="feature-preview__bars">
        <div className="feature-preview__bar-wrap">
          <div className="feature-preview__bar feature-preview__bar--now" />
          <span>Now</span>
        </div>
        <div className="feature-preview__bar-wrap">
          <div className="feature-preview__bar feature-preview__bar--whatif" />
          <span>What if</span>
        </div>
      </div>
    </div>
  )
}

function GoalsPreview() {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = circumference * (2 / 3)
  return (
    <div className="feature-preview feature-preview--goals">
      <svg className="feature-preview__goals-ring" viewBox="0 0 140 140" aria-hidden="true">
        <circle className="feature-preview__ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="feature-preview__ring-progress"
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
        />
        <g className="feature-preview__tree">
          <rect x="66" y="78" width="8" height="28" rx="2" fill="#8B5E3C" />
          <path d="M70 78 L58 92 L82 92 Z" fill="#8B5E3C" />
          <circle className="feature-preview__leaf" cx="58" cy="68" r="14" fill="#5E9B6E" />
          <circle className="feature-preview__leaf" cx="82" cy="68" r="14" fill="#6BAD78" />
          <circle className="feature-preview__leaf" cx="70" cy="54" r="16" fill="#7BC48A" />
        </g>
      </svg>
    </div>
  )
}

function RemindersPreview() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <div className="feature-preview feature-preview--reminders">
      {days.map((day, index) => (
        <div
          key={`${day}-${index}`}
          className={`feature-preview__day${index === 3 ? ' feature-preview__day--best' : ''}`}
        >
          <span className="feature-preview__day-icon" aria-hidden="true">
            {index === 3 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a4 4 0 0 0-8 0c0 4-4 5-4 5h16s-4-1-4-5" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            ) : index % 2 === 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.85">
                <ellipse cx="10" cy="14" rx="6" ry="4" />
                <ellipse cx="15" cy="12" rx="5" ry="3.5" />
              </svg>
            )}
          </span>
          <span className="feature-preview__day-label">{day}</span>
          {index === 3 ? <span className="feature-preview__day-best">BEST</span> : null}
        </div>
      ))}
    </div>
  )
}

function Preview({ id }: { id: ImproveFeatureId }) {
  if (id === 'whatif') return <WhatIfPreview />
  if (id === 'goals') return <GoalsPreview />
  return <RemindersPreview />
}

export function ImproveFeatureCards({ locked = false, onOpenFeature }: Props) {
  const [tremblingId, setTremblingId] = useState<ImproveFeatureId | null>(null)

  function open(feature: ImproveFeatureId) {
    if (locked) {
      setTremblingId(feature)
      window.setTimeout(() => setTremblingId((id) => (id === feature ? null : id)), 480)
    }
    onOpenFeature(feature)
  }

  return (
    <ul className="improve-feature-cards">
      {IMPROVE_FEATURES.map((feature) => (
        <li key={feature.id} className="improve-feature-cards__item">
          <a
            className={`improve-feature-card improve-feature-card--${feature.id}${
              locked ? ' improve-feature-card--locked' : ''
            }${tremblingId === feature.id ? ' improve-feature-card--trembling' : ''}`}
            href={`#${feature.id}`}
            onClick={(event) => {
              event.preventDefault()
              open(feature.id)
            }}
            aria-label={locked ? `${feature.ariaLabel}. Complete your setup to unlock.` : feature.ariaLabel}
          >
            <div className="improve-feature-card__preview" aria-hidden="true">
              <Preview id={feature.id} />
              {locked ? (
                <span className="improve-feature-card__lock">
                  <LockIcon width={22} height={22} />
                </span>
              ) : null}
            </div>
            <div className="improve-feature-card__body">
              <div className="improve-feature-card__head">
                <span className="improve-feature-card__eyebrow">{feature.eyebrow}</span>
                <span className="improve-feature-card__pill">{feature.pill}</span>
              </div>
              <h3 className="improve-feature-card__title">{feature.title}</h3>
              <p className="improve-feature-card__desc">{feature.body}</p>
              <div className="improve-feature-card__foot">
                <span className="improve-feature-card__cta">{feature.action}</span>
                <span className="improve-feature-card__arrow">
                  <FeatureArrow />
                </span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
