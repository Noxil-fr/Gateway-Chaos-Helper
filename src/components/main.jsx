import { useState, useEffect, useRef } from 'react'

const QUERY_TYPES = [
  { value: 'SetRepairOrder', label: 'SetRepairOrder' },
  { value: 'GatewayVersion', label: 'Gateway Version' },
]

const SEARCH_MODES = [
  { value: 'folderID', label: 'Internal №' },
  { value: 'immat', label: 'Plate №' },
  { value: 'orNumber', label: 'OR №' },
]

// ── History helpers ───────────────────────────────────────────────────────────
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

// ── HistoryInput ──────────────────────────────────────────────────────────────
function HistoryInput({ value, onChange, onKeyDown, placeholder, historyKey, ...props }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const ref = useRef()

  const refreshSuggestions = (currentValue) => {
    const stored = getHistory()
    setSuggestions((stored[historyKey] || []).filter(v => v !== currentValue))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { saveToHistory(historyKey, value); setShowDropdown(false) }
    if (onKeyDown) onKeyDown(e)
  }

  const handleFocus = () => { refreshSuggestions(value); setShowDropdown(true) }
  const handleSelect = (val) => { onChange({ target: { value: val } }); setShowDropdown(false) }

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="history-input-wrapper" ref={ref}>
      <input {...props} value={value} onChange={onChange} onKeyDown={handleKeyDown} onFocus={handleFocus} placeholder={placeholder} />
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

// ── Main component ────────────────────────────────────────────────────────────
export default function SearchBar({ requests, onResult, totalCount, logStart, logEnd, lastResult, onShowErrorsChange, failedCount }) {
  const [queryType, setQueryType] = useState('SetRepairOrder')
  const [showErrors, setShowErrors] = useState(true)
  const [searchMode, setSearchMode] = useState('folderID')
  const [emp, setEmp] = useState('')
  const [interne, setInterne] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)
  const [visibleFailed, setVisibleFailed] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const scrollRef = useRef()

  // Gateway Version states
  const [gatewaySubscriberId, setGatewaySubscriberId] = useState('')
  const [gatewayResult, setGatewayResult] = useState(null)
  const [gatewayLoading, setGatewayLoading] = useState(false)
  const [gatewayError, setGatewayError] = useState(null)

  const handleGatewayCheck = async () => {
    const id = gatewaySubscriberId.trim()
    if (!id) return
    setGatewayLoading(true)
    setGatewayError(null)
    setGatewayResult(null)
    try {
      const url = `https://n8n.nextlane.io/webhook/fe36c482-f57f-4950-875a-97ee2686fb20/${id}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGatewayResult(data)
    } catch (e) {
      setGatewayError(e.message)
    } finally {
      setGatewayLoading(false)
    }
  }

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
      if (i >= 4) { clearInterval(interval); setTimeout(() => setVisibleFailed(true), 150) }
    }, 120)
    return () => clearInterval(interval)
  }, [logStart])

  useEffect(() => {
    if (!lastResult) return
    setSearchHistory(prev => [...prev, lastResult])
  }, [lastResult])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [searchHistory, visibleFailed])

  useEffect(() => { setSearchValue(''); setEmp(''); setInterne('') }, [searchMode])

  const handleToggleErrors = (val) => {
    setShowErrors(val)
    if (onShowErrorsChange) onShowErrorsChange(val)
  }

  const handleSearch = () => {
    let found = [], label = ''
    if (searchMode === 'folderID') {
      if (!emp.trim() || !interne.trim()) return
      label = `${emp.trim()}|${interne.trim()}`
      found = requests.filter((r) => r.InternalFolderID === label)
      saveToHistory('emp', emp.trim())
      saveToHistory('interne', interne.trim())
    } else if (searchMode === 'immat') {
      if (!searchValue.trim()) return
      label = searchValue.trim().toUpperCase()
      found = requests.filter((r) => (r.VehicleRegistrationNumber || '').toUpperCase() === label)
      saveToHistory('immat', searchValue.trim())
    } else if (searchMode === 'orNumber') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = requests.filter((r) => (r.FolderNumber || '') === label)
      saveToHistory('orNumber', searchValue.trim())
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

  const handleKey = (e) => { if (e.key === 'Enter') handleSearch() }
  const logDate = logStart ? extractDate(logStart) : null

  const isSearchDisabled = requests.length === 0 || (
    searchMode === 'folderID' ? !emp.trim() || !interne.trim() : !searchValue.trim()
  )

  const searchPlaceholder = { folderID: 'e.g. 210062', immat: 'e.g. AB-123-CD', orNumber: 'e.g. 107898' }[searchMode]
  const searchLabel = { folderID: 'Internal number', immat: 'License plate', orNumber: 'OR number' }[searchMode]
  const historyKey = { folderID: 'interne', immat: 'immat', orNumber: 'orNumber' }[searchMode]

  return (
    <div className="search-section">
      <div className="search-three-col">

        {/* Col 1 — Query type + Show errors */}
        <div className="search-col-query">
          <div className="search-block block-query" style={{ height: '100%' }}>
            <div className="field">
              <label>Query type</label>
              <select className="search-select" value={queryType} onChange={(e) => setQueryType(e.target.value)}>
                {QUERY_TYPES.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Show errors</label>
              <div className="toggle-row">
                <button className={`toggle-btn ${showErrors ? 'active' : ''}`} onClick={() => handleToggleErrors(true)}>Yes</button>
                <button className={`toggle-btn ${!showErrors ? 'active' : ''}`} onClick={() => handleToggleErrors(false)}>No</button>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2 — contenu selon queryType */}
        <div className="search-col-fields">
          {queryType === 'GatewayVersion' ? (
            <div className="search-block block-fields" style={{ height: '100%' }}>
              <div className="field">
                <label>Subscriber ID</label>
                <input
                  type="text"
                  placeholder="e.g. 8886406D-7C72-4260-806A-B7AE81EDFD49"
                  value={gatewaySubscriberId}
                  onChange={(e) => setGatewaySubscriberId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGatewayCheck()}
                />
              </div>
              <div className="field">
                <label>Known clients <span className="optional">— coming soon</span></label>
                <select className="search-select" disabled>
                  <option>— select a client —</option>
                </select>
              </div>
              <button
                className="search-btn"
                onClick={handleGatewayCheck}
                disabled={!gatewaySubscriberId.trim() || gatewayLoading}
              >
                {gatewayLoading ? 'Checking…' : 'Check 🔍'}
              </button>

              {gatewayError && (
                <div className="gateway-error">⚠ {gatewayError}</div>
              )}

              {gatewayResult && (
                <div className="gateway-result">
                  <div className="gateway-row">
                    <span className="gateway-label">DMS</span>
                    <span className="gateway-value">{gatewayResult.DMS || '—'}</span>
                  </div>
                  <div className="gateway-row">
                    <span className="gateway-label">Gateway</span>
                    <span className="gateway-value">{gatewayResult.Version || '—'}</span>
                  </div>
                  <div className="gateway-row">
                    <span className="gateway-label">DB</span>
                    <span className="gateway-value">{gatewayResult.PROVIDER || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="search-block block-fields">
                <div className="search-mode-toggle">
                  {SEARCH_MODES.map((mode) => (
                    <button key={mode.value} className={`mode-btn ${searchMode === mode.value ? 'active' : ''}`} onClick={() => setSearchMode(mode.value)}>
                      {mode.label}
                    </button>
                  ))}
                </div>

                {searchMode === 'folderID' && (
                  <div className="field">
                    <label>EMP (3-digit code)</label>
                    <HistoryInput
                      type="text" placeholder="e.g. 001" value={emp}
                      onChange={(e) => setEmp(e.target.value)}
                      onKeyDown={handleKey} maxLength={10}
                      historyKey="emp"
                    />
                  </div>
                )}

                <div className="field">
                  <label>{searchLabel}</label>
                  <HistoryInput
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchMode === 'folderID' ? interne : searchValue}
                    onChange={(e) => searchMode === 'folderID' ? setInterne(e.target.value) : setSearchValue(e.target.value)}
                    onKeyDown={handleKey}
                    historyKey={historyKey}
                    key={searchMode}
                  />
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
                <button className="search-btn" onClick={handleSearch} disabled={isSearchDisabled}>Let's go 🔥</button>
                <div className="reset-hint">Press <kbd>F5</kbd> to reset</div>
              </div>
            </>
          )}
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
                    {visibleLines >= 1 && <div><span className="terminal-key">SetRepairOrder </span><span className="terminal-value">{totalCount} request{totalCount > 1 ? 's' : ''} found</span></div>}
                    {visibleLines >= 2 && <div><span className="terminal-key">Log date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{logDate}</span></div>}
                    {visibleLines >= 3 && <div><span className="terminal-key">From&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{extractTime(logStart) || '—'}</span></div>}
                    {visibleLines >= 4 && <div><span className="terminal-key">To&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{extractTime(logEnd) || '—'}</span></div>}
                    {visibleFailed && failedCount > 0 && (
                      <div>
                        <span className="terminal-key">Failed&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                        <span className="terminal-warn">{failedCount} failed request{failedCount > 1 ? 's' : ''}</span>
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
    </div>
  )
}
