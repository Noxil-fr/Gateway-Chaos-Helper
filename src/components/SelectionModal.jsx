import { useState } from 'react'

const MAX_SUBTABS = 16

export default function SelectionModal({ internalFolderID, found, totalCount, onConfirm, onClose }) {
  const [selected, setSelected] = useState(new Set())

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        if (next.size >= MAX_SUBTABS) return prev
        next.add(idx)
      }
      return next
    })
  }

  const handleConfirm = () => {
    const items = [...selected].map(i => found[i])
    onConfirm(items)
  }

  const formatPreview = (req) => {
    const queryType = req._queryType || 'Call'
    const clean = Object.fromEntries(Object.entries(req).filter(([k]) => !k.startsWith('_')))
    const json = JSON.stringify(clean)
    const snippet = json.length > 60 ? json.slice(0, 60) + '…' : json
    return `Call ${queryType} — ${snippet}`
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup popup-selection" onClick={(e) => e.stopPropagation()}>
        <div className="popup-title">⚠ Many results found</div>
        <p>
          <strong>{found.length}</strong> requests found for <code>{internalFolderID}</code>.
          Select up to <strong>{MAX_SUBTABS}</strong> to open in results.
        </p>

        <div className="selection-list">
          {found.map((req, idx) => {
            const isChecked = selected.has(idx)
            const isDisabled = !isChecked && selected.size >= MAX_SUBTABS
            return (
              <label
                key={idx}
                className={`selection-row ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => toggle(idx)}
                />
                <span className="selection-time">{req._timestamp?.slice(11, 19) || '—'}</span>
                <span className="selection-preview">{formatPreview(req)}</span>
              </label>
            )
          })}
        </div>

        <div className="popup-actions">
          <button className="soft-btn" onClick={onClose}>Cancel</button>
          <button
            className="search-btn search-btn-red"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            Open {selected.size > 0 ? `(${selected.size})` : ''} 🔥
          </button>
        </div>
      </div>
    </div>
  )
}
