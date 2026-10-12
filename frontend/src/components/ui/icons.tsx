/**
 * Line icons for the rail, forms, and marketing clusters.
 *
 * Each export is an 18×18 currentColor SVG with aria-hidden so the nearby
 * text (or aria-label on the button) provides the name. Do not add a full
 * JSDoc block per icon — they share this stroke set and differ only in path.
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function icon(props: IconProps) {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...props,
  }
}

export function BoltIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7z" />
    </svg>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7.5h.01" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M12 3 5 6v6c0 4.2 2.7 7.2 7 9 4.3-1.8 7-4.8 7-9V6l-7-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function QuestionIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.2.9-1.2 1.7" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M5 19c8-1 13-8 14-15-7 1-14 6-14 15z" />
      <path d="M5 19c3-6 8-10 14-12" />
    </svg>
  )
}

export function PlugIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M9 7v5" />
      <path d="M15 7v5" />
      <path d="M7 12h10v2a5 5 0 0 1-10 0v-2z" />
      <path d="M12 19v3" />
    </svg>
  )
}

export function BarsIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M5 19V10" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="m13 7 4 4" />
    </svg>
  )
}

export function PeopleIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 19c.4-2.2 1.7-3.8 3.6-4.5" />
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.5 0-2.6.8-2.6 1.9 0 2.6 5.2 1.4 5.2 4.1 0 1.1-1.1 2-2.6 2-1.2 0-2.2-.5-2.7-1.4M12 6.5V8M12 16v1.5" />
    </svg>
  )
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M5 9h13l-3.5-3.5M19 15H6l3.5 3.5" />
    </svg>
  )
}

export function BatteryIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 10.5v3" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function ResetIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 5v5h5" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  )
}

export function ClusterIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="m4 12 3.5-3 3.5 3" />
      <path d="M5.2 11.5V17h5.6v-5.5" />
      <path d="m13 13 3.2-2.7 3.2 2.7" />
      <path d="M14.1 12.6V17H19v-4.2" />
    </svg>
  )
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M5 5h6v8H5z" />
      <path d="M13 5h6v5h-6z" />
      <path d="M13 12h6v7h-6z" />
      <path d="M5 15h6v4H5z" />
    </svg>
  )
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19.5h14" />
    </svg>
  )
}

export function BulbIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 1 3.6 10.8c-.7.5-1.1 1.2-1.2 2.2h-4.8c-.1-1-.5-1.7-1.2-2.2A6 6 0 0 1 12 3z" />
    </svg>
  )
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M5.5 7h13" />
      <path d="M8 7V5.5h8V7" />
      <path d="M7.5 7l.75 11h8.5l.75-11" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  )
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M15 5.2A3 3 0 0 0 9 6v4.2" />
      <path d="M9 13.2a3 3 0 0 0 5.2 1" />
      <path d="M5.5 11a6.5 6.5 0 0 0 10.2 5.3M18.5 11v.6" />
      <path d="M12 17.5V21" />
      <path d="M4 3l16 18" />
    </svg>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M9.5 5v14M14.5 5v14" />
    </svg>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <path d="M6 17v-5.5a6 6 0 0 1 12 0V17l1.7 2.2a1 1 0 0 1-.8 1.6H5.1a1 1 0 0 1-.8-1.6L6 17z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...icon(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  )
}
