/**
 * Searchable list for battery models and electricity retailers.
 */
import { useMemo, useState } from 'react'
import { NOT_SURE_VALUE, OTHER_VALUE } from '../../data/profileOptions'
import { Field } from './Field'
import { ChevronIcon, QuestionIcon, SearchIcon } from './icons'

const DEFAULT_EXTRA = [OTHER_VALUE, NOT_SURE_VALUE]

type Props = {
  label: string
  hint?: string
  error?: string
  info?: string
  value: string
  placeholder?: string
  options: string[]
  heading?: string
  extraOptions?: string[]
  onChange: (value: string) => void
}

/**
 * SearchSelect
 * @param props.value - Current selected catalogue value (never free text)
 * @param props.options - Popular items shown when the query is empty
 * @returns JSX.Element
 *
 * Extra options (Other / Not sure) always stay visible under the filtered list.
 * The input may show a search query; only a catalogue match is written back.
 */
export function SearchSelect({
  label,
  hint,
  error,
  info,
  value,
  placeholder = 'Search or select',
  options,
  heading = 'Popular options',
  extraOptions = DEFAULT_EXTRA,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  // Sync the edit buffer when the saved value changes externally (e.g. the
  // profile reloads). Adjusted during render rather than in a useEffect,
  // per React's documented pattern, so it doesn't cost an extra commit.
  const [shownValue, setShownValue] = useState(value)
  if (value !== shownValue) {
    setShownValue(value)
    setQuery(value)
  }

  const catalogue = useMemo(() => [...options, ...extraOptions], [extraOptions, options])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const exactMatch = catalogue.some((item) => item.toLowerCase() === q)
    if (!q || exactMatch) return options
    return options.filter((item) => item.toLowerCase().includes(q))
  }, [catalogue, options, query])

  function commit(next: string) {
    onChange(next)
    setQuery(next)
    setOpen(false)
  }

  function onQuery(next: string) {
    setQuery(next)
    setOpen(true)
    const trimmed = next.trim()
    if (!trimmed) {
      onChange('')
      return
    }
    const match = catalogue.find((item) => item.toLowerCase() === trimmed.toLowerCase())
    if (match) onChange(match)
  }

  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div className={`ui-search${error ? ' ui-search--error' : ''}`}>
        <div className="ui-search__input-wrap">
          <SearchIcon />
          <input
            className="ui-search__input"
            value={query}
            placeholder={placeholder}
            onChange={(event) => onQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setQuery(value)
                setOpen(false)
              }, 120)
            }}
            aria-invalid={Boolean(error)}
            autoComplete="off"
          />
          <span className="ui-search__chevron">
            <ChevronIcon />
          </span>
        </div>
        {open ? (
          <div className="ui-search__list" role="listbox">
            <div className="ui-search__heading">{heading}</div>
            {filtered.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={value === item}
                className={`ui-radio-list__row${value === item ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(item)}
              >
                <span className="ui-radio-list__mark" />
                <span className="ui-radio-list__label">{item}</span>
              </button>
            ))}
            {extraOptions.map((item) => (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={value === item}
                className={`ui-radio-list__row${value === item ? ' is-selected' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(item)}
              >
                {item === NOT_SURE_VALUE ? <QuestionIcon /> : <span className="ui-radio-list__mark" />}
                <span className="ui-radio-list__label">{item}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  )
}
