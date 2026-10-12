type Props = {
  /** Seedling before a file is read; full tree after. */
  variant: 'seedling' | 'tree'
}

export function GoalsTreeBadge({ variant }: Props) {
  return (
    <span className="goals-targets__badge" aria-hidden>
      {variant === 'seedling' ? (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M14 24V12"
            stroke="#9BC4A8"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 14C14 14 10 12 10 8.5C10 6.5 11.5 5 13.5 5C14 6.5 14 7 14 7C14 7 14 6.5 14.5 5C16.5 5 18 6.5 18 8.5C18 12 14 14 14 14Z"
            fill="#6FA882"
          />
          <ellipse cx="14" cy="24" rx="5" ry="1.2" fill="#4A7358" opacity="0.5" />
        </svg>
      ) : (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M15 26V14"
            stroke="#7A9E86"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="15" cy="11" r="7" fill="#5F9A72" />
          <circle cx="11" cy="13" r="4.5" fill="#6FA882" />
          <circle cx="19" cy="13" r="4.5" fill="#6FA882" />
          <ellipse cx="15" cy="26" rx="6" ry="1.3" fill="#4A7358" opacity="0.45" />
        </svg>
      )}
    </span>
  )
}
