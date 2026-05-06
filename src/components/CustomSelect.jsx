import { useState, useRef, useEffect, useMemo } from 'react'

export default function CustomSelect({ options, value, onChange, disabled, placeholder, searchable = false }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()
  const inputRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
    if (!open) setSearch('')
  }, [open])

  const pinned = useMemo(() => options.filter(o => o.pin), [options])

  const sorted = useMemo(() =>
    [...options.filter(o => !o.pin)].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  )

  const filtered = useMemo(() =>
    sorted.filter(o => o.label.toLowerCase().includes(search.toLowerCase())),
    [sorted, search]
  )

  const selected = options.find(o => o.value === value)

  return (
    <div className="client-dropdown" ref={ref}>
      <button
        className={`client-dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        type="button"
      >
        <span>{selected ? selected.label : (placeholder || '— Select —')}</span>
        <span className="client-dropdown-arrow">▾</span>
      </button>
      {open && (
        <div className="client-dropdown-list">
          {searchable && (
            <div className="client-dropdown-search">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="client-dropdown-scroll">
            {placeholder && !search && (
              <div
                className={`client-dropdown-option ${!value ? 'selected' : ''}`}
                onMouseDown={() => { onChange(''); setOpen(false) }}
              >
                {placeholder}
              </div>
            )}
            {pinned.length > 0 && !search && (
              <>
                {pinned.map(o => (
                  <div
                    key={o.value}
                    className={`client-dropdown-option client-dropdown-option--pinned ${value === o.value ? 'selected' : ''}`}
                    onMouseDown={() => { onChange(o.value); setOpen(false) }}
                  >
                    {o.label}
                  </div>
                ))}
                <div className="client-dropdown-divider" />
              </>
            )}
            {filtered.length === 0 && (
              <div className="client-dropdown-empty">No results</div>
            )}
            {filtered.map(o => (
              <div
                key={o.value}
                className={`client-dropdown-option ${value === o.value ? 'selected' : ''}`}
                onMouseDown={() => { onChange(o.value); setOpen(false) }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
