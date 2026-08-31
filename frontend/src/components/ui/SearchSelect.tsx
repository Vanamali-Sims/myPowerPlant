import { useMemo, useState } from 'react'
import { Field } from './Field'
import { ChevronIcon, QuestionIcon, SearchIcon } from './icons'

const DEFAULT_EXTRA = ['Other', 'Not sure']

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

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    const exactMatch =
      options.some((item) => item.toLowerCase() === q) ||
      extraOptions.some((item) => item.toLowerCase() === q)
    if (!q || exactMatch) return options
    return options.filter((item) => item.toLowerCase().includes(q))
  }, [extraOptions, options, value])

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Field label={label} hint={hint} error={error} info={info}>
      <div className={`ui-search${error ? ' ui-search--error' : ''}`}>
        <div className="ui-search__input-wrap">
          <SearchIcon />
          <input
            className="ui-search__input"
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              onChange(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
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
                onClick={() => choose(item)}
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
                onClick={() => choose(item)}
              >
                {item === 'Not sure' ? <QuestionIcon /> : <span className="ui-radio-list__mark" />}
                <span className="ui-radio-list__label">{item}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  )
}
