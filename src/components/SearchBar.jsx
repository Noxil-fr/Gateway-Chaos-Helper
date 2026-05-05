import { useState, useEffect, useRef, useCallback } from 'react'
import CustomSelect from './CustomSelect'

const QUERY_TYPES = [
  { value: 'SetRepairOrder', label: 'SetRepairOrder - RO' },
  { value: 'SetWorkShopAppointmentV2', label: 'SetWorkShopAppointmentV2' },
]

const SEARCH_MODES_BY_QUERY = {
  SetRepairOrder: [
    { value: 'folderID', label: 'Internal №' },
    { value: 'immat', label: 'Plate №' },
    { value: 'orNumber', label: 'RO №' },
  ],
  SetWorkShopAppointmentV2: [
    { value: 'folderID', label: 'Internal №' },
    { value: 'immat', label: 'Plate №' },
    { value: 'vin', label: 'VIN' },
  ],
}

const getSearchModes = (queryType) => SEARCH_MODES_BY_QUERY[queryType] || SEARCH_MODES_BY_QUERY.SetRepairOrder

const getFieldConfig = (queryType, searchMode) => {
  if (queryType === 'SetWorkShopAppointmentV2') {
    if (searchMode === 'folderID') {
      return { label: 'Internal appointment ID', placeholder: 'e.g. 001|431994', historyKey: 'ws_appt' }
    }
    if (searchMode === 'immat') {
      return { label: 'License plate', placeholder: 'e.g. AB-123-CD', historyKey: 'ws_plate' }
    }
    if (searchMode === 'vin') {
      return { label: 'VIN', placeholder: 'e.g. WME4533421K232068', historyKey: 'ws_vin' }
    }
  }

  // SetRepairOrder
  if (searchMode === 'folderID') {
    return { label: 'Internal folder ID', placeholder: 'e.g. 001|404299', historyKey: 'interne' }
  }
  if (searchMode === 'immat') {
    return { label: 'License plate', placeholder: 'e.g. AB-123-CD', historyKey: 'immat' }
  }
  return { label: 'RO number', placeholder: 'e.g. 107898', historyKey: 'orNumber' }
}

// Global helpers pour l'historique — indépendant du composant
const getHistory = () => {
  try { return JSON.parse(sessionStorage.getItem('searchHistory') || '{}') } catch { return {} }
}
const saveToHistory = (key, val) => {
  if (!val?.trim()) return
  const stored = getHistory()
  const existing = stored[key] || []
  stored[key] = [val, ...existing.filter(v => v !== val)].slice(0, 3)
  sessionStorage.setItem('searchHistory', JSON.stringify(stored))
}

function HistoryInput({ value, onChange, onKeyDown, placeholder, historyKey, ...props }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef()

  // Reload suggestions whenever historyKey changes or on focus
  const refreshSuggestions = (currentValue) => {
    const stored = getHistory()
    setSuggestions((stored[historyKey] || []).filter(v => v !== currentValue))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveToHistory(historyKey, value)
      setShowDropdown(false)
    }
    if (onKeyDown) onKeyDown(e)
  }

  const handleFocus = () => {
    refreshSuggestions(value)
    setShowDropdown(true)
  }

  const handleSelect = (val) => {
    onChange({ target: { value: val } })
    setShowDropdown(false)
  }

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="history-input-wrapper" ref={ref}>
      <input
        {...props}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="history-dropdown">
          {suggestions.map((s, i) => (
            <div key={i} className="history-item" onMouseDown={() => handleSelect(s)}>
              <span className="history-icon">⏱</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchBar({ requests, onResult, totalCount, logStart, logEnd, lastResult, onShowErrorsChange, failedCount, errorCount, onOpenRawRequest }) {
  const [queryType, setQueryType] = useState('SetRepairOrder')
  const [showErrors, setShowErrors] = useState(true)
  const [showRawPopup, setShowRawPopup] = useState(false)
  const [rawText, setRawText] = useState('')
  const [rawError, setRawError] = useState(null)
  const [searchMode, setSearchMode] = useState('folderID')
  const [searchValue, setSearchValue] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)
  const [visibleFailed, setVisibleFailed] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const scrollRef = useRef()


  const extractTime = (isoStr) => { if (!isoStr) return ''; return isoStr.slice(11, 16) }
  const extractDate = (isoStr) => { if (!isoStr) return ''; return isoStr.slice(0, 10) }

  useEffect(() => {
    if (logStart) setTimeStart(extractTime(logStart))
    if (logEnd) setTimeEnd(extractTime(logEnd))
  }, [logStart, logEnd])

  useEffect(() => {
    if (!logStart) { setVisibleLines(0); setVisibleFailed(false); setSearchHistory([]); return }
    setVisibleLines(1)
    let i = 1
    const interval = setInterval(() => {
      i++
      setVisibleLines(i)
      if (i >= 4) {
        clearInterval(interval)
        setTimeout(() => setVisibleFailed(true), 150)
      }
    }, 120)
    return () => clearInterval(interval)
  }, [logStart])

  useEffect(() => {
    if (!lastResult) return
    setSearchHistory(prev => [...prev, lastResult])
  }, [lastResult])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [searchHistory, visibleFailed])

  useEffect(() => { setSearchValue('') }, [searchMode])
  useEffect(() => {
    const modes = getSearchModes(queryType)
    if (!modes.some(m => m.value === searchMode)) setSearchMode(modes[0].value)
    setSearchValue('')
  }, [queryType])

  const handleToggleErrors = (val) => {
    setShowErrors(val)
    if (onShowErrorsChange) onShowErrorsChange(val)
  }

  const formatJson = (obj) => {
    try { return JSON.stringify(obj, null, 2) } catch { return '' }
  }

  const handleRawOpen = () => {
    setRawError(null)
    if (!rawText.trim()) { setRawError('Please paste a JSON request first.'); return }
    let obj
    try {
      obj = JSON.parse(rawText)
    } catch {
      setRawError('Invalid JSON. Please fix it and try again.')
      return
    }
    if (obj === null || Array.isArray(obj) || typeof obj !== 'object') {
      setRawError('The JSON must be an object (e.g. { "InternalFolderID": "..." }).')
      return
    }
    const pretty = formatJson(obj)
    if (pretty) setRawText(pretty)
    if (onOpenRawRequest) onOpenRawRequest(obj)
    setShowRawPopup(false)
  }

  const handleApiSearch = () => { // ✅ renommé
    let found = [], label = ''
    const typedRequests = queryType ? requests.filter(r => r._queryType === queryType) : requests
    if (searchMode === 'folderID') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      if (queryType === 'SetWorkShopAppointmentV2') {
        found = typedRequests.filter((r) => r.InternalAppointmentID === label)
      } else {
        found = typedRequests.filter((r) => r.InternalFolderID === label)
      }
      saveToHistory(queryType === 'SetWorkShopAppointmentV2' ? 'ws_appt' : 'interne', searchValue.trim())
    } else if (searchMode === 'immat') {
      if (!searchValue.trim()) return
      label = searchValue.trim().toUpperCase()
      if (queryType === 'SetWorkShopAppointmentV2') {
        found = typedRequests.filter((r) => ((r.Vehicle?.RegistrationNumber || r.RegistrationNumber || '')).toUpperCase() === label)
        saveToHistory('ws_plate', searchValue.trim())
      } else {
        found = typedRequests.filter((r) => (r.VehicleRegistrationNumber || '').toUpperCase() === label)
        saveToHistory('immat', searchValue.trim())
      }
    } else if (searchMode === 'orNumber') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.FolderNumber || '') === label)
      saveToHistory('orNumber', searchValue.trim())
    } else if (searchMode === 'vin') {
      if (!searchValue.trim()) return
      label = searchValue.trim().toUpperCase()
      found = typedRequests.filter((r) => ((r.Vehicle?.VIN || r.VIN || '')).toUpperCase() === label)
      saveToHistory('ws_vin', searchValue.trim())
    }
    if (timeStart || timeEnd) {
      found = found.filter((r) => {
        if (!r._timestamp) return true
        const time = r._timestamp.slice(11, 16)
        if (timeStart && time < timeStart) return false
        if (timeEnd && time > timeEnd) return false
        return true
      })
    }
    onResult({ internalFolderID: label, found, totalCount })
  }

const handleKey = (e) => { if (e.key === 'Enter') handleApiSearch() }
  const logDate = logStart ? extractDate(logStart) : null

  const isSearchDisabled = requests.length === 0 || !searchValue.trim()

  const typedTotal = queryType ? requests.filter(r => r._queryType === queryType).length : requests.length
  const { placeholder: searchPlaceholder, label: searchLabel, historyKey } = getFieldConfig(queryType, searchMode)

  return (
    <div className="search-section">
      <div className="search-three-col">

        {/* Col 1 — Query type + Show errors */}
        <div className="search-col-query">
          <div className="search-block block-query" style={{ height: '100%' }}>
            <div className="field">
              <label>Query type</label>
              <CustomSelect
                options={QUERY_TYPES}
                value={queryType}
                onChange={setQueryType}
              />
            </div>

            <div className="field">
              <label>Show errors</label>
              <div className="toggle-row">
                <button className={`toggle-btn ${showErrors ? 'active' : ''}`} onClick={() => handleToggleErrors(true)}>Yes</button>
                <button className={`toggle-btn ${!showErrors ? 'active' : ''}`} onClick={() => handleToggleErrors(false)}>No</button>
              </div>
            </div>

            {onOpenRawRequest && (
  <>
    <div className="search-col-divider" />
    <div className="field">
      <label>Convert to JSON format</label>
      <button className="soft-btn" onClick={() => { setRawError(null); setShowRawPopup(true) }}>
        Paste a raw query
      </button>
    </div>
  </>
)}
          </div>
        </div>

        {/* Col 2 — Fields + dates + actions */}
        <div className="search-col-fields">
          <div className="search-block block-fields">
            <div className="search-input-row">
              <div className="field">
                <label>Search by</label>
                <CustomSelect
                  options={getSearchModes(queryType)}
                  value={searchMode}
                  onChange={setSearchMode}
                />
              </div>

              <div className="field search-value-field">
                <label>{searchLabel}</label>
                <HistoryInput
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKey}
                  historyKey={historyKey}
                />
              </div>
            </div>
          </div>

          <div className="search-block block-dates">
            <div className="search-dates-row">
              <div className="field">
                <label>From <span className="optional">— optional</span></label>
                <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
              </div>
              <div className="field">
                <label>To <span className="optional">— optional</span></label>
                <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="search-actions-row">
            <button className="search-btn" onClick={handleApiSearch} disabled={isSearchDisabled}>Let's go 🔥</button>
            <div className="reset-hint">Press <kbd>F5</kbd> to reset</div>

           
          </div>
        </div>

        {/* Col 3 — Terminal */}
        <div className="search-col-terminal">
          <div className="terminal">
            <div className="terminal-body">
              <div className="terminal-fixed">
                {!logStart ? (
                  <span className="terminal-muted">Waiting for a log file...</span>
                ) : (
                  <>
                    {visibleLines >= 1 && (
                      <div>
                        <span className="terminal-key">{queryType} </span>
                        <span className="terminal-value">{typedTotal} request{typedTotal > 1 ? 's' : ''} found</span>
                      </div>
                    )}
                    {visibleLines >= 2 && <div><span className="terminal-key">Log date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{logDate}</span></div>}
                    {visibleLines >= 3 && <div><span className="terminal-key">From&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{extractTime(logStart) || '—'}</span></div>}
                    {visibleLines >= 4 && <div><span className="terminal-key">To&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{extractTime(logEnd) || '—'}</span></div>}
                    {visibleFailed && failedCount > 0 && (
                      <div>
                        <span className="terminal-key">Failed&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        <span className="terminal-warn">{failedCount} failed request{failedCount > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {visibleFailed && errorCount > 0 && (
                      <div>
                        <span className="terminal-key">Errors&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        <span className="terminal-warn">{errorCount} error{errorCount > 1 ? 's' : ''} detected</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {searchHistory.length > 0 && (
                <div className="terminal-scroll" ref={scrollRef}>
                  {searchHistory.map((result, idx) => (
                    <div key={idx} className="terminal-result-block">
                      <div style={{ borderTop: '1px solid #2a2a2a', margin: '0.3rem 0' }} />
                      <div><span className="terminal-key">Search&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{result.internalFolderID}</span></div>
                      <div>
                        <span className="terminal-key">Result&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        <span className={result.found.length === 0 ? 'terminal-warn' : 'terminal-value'}>{result.found.length} found</span>
                      </div>
                      {result.found.map((item, i) => (
                        <div key={i}>
                          <span className="terminal-key">  #{i + 1}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                          <span className="terminal-value">{item._timestamp || '—'}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {showRawPopup && (
        <div className="popup-overlay" onClick={() => setShowRawPopup(false)}>
          <div className="popup popup-wide" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">Paste request JSON</div>
            <div className="field">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder='Paste a raw request JSON here…'
                rows={12}
                autoFocus
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleRawOpen()
                }}
              />
              {rawError && <div className="inline-error">{rawError}</div>}
              {!rawError && rawText.trim() && <div className="inline-hint">Tip: press Ctrl+Enter to open.</div>}
            </div>
            <div className="popup-actions">
              <button className="soft-btn" onClick={() => setShowRawPopup(false)}>Close</button>
              <button className="search-btn" onClick={handleRawOpen}>Format & open</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}