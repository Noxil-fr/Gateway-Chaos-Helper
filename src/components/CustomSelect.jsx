import { useState, useRef, useEffect } from 'react'

export default function CustomSelect({ options, value, onChange, disabled, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
          {placeholder && (
            <div
              className={`client-dropdown-option ${!value ? 'selected' : ''}`}
              onMouseDown={() => { onChange(''); setOpen(false) }}
            >
              {placeholder}
            </div>
          )}
          {options.map(o => (
            <div
              key={o.value}
              className={`client-dropdown-option ${value === o.value ? 'selected' : ''}`}
              onMouseDown={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
