import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import CustomSelect from './CustomSelect'

const QUERY_TYPES = [
  { value: 'SetRepairOrder', label: 'SetRepairOrder' },
  { value: 'SetWorkShopAppointmentV2', label: 'SetWorkShopAppointmentV2' },
  { value: 'SetClients', label: 'SetClients' },
  { value: 'SetEvents', label: 'SetEvents' },
]

const SEARCH_MODES_BY_QUERY = {
  SetRepairOrder: [
    { value: 'random', label: 'Random request', pin: true },
    { value: 'folderID', label: 'Internal ID (Keys)' },
    { value: 'immat', label: 'Plate' },
    { value: 'orNumber', label: 'RO' },
    { value: 'clientID', label: 'Codigo Cliente' },
  ],
  SetWorkShopAppointmentV2: [
    { value: 'random', label: 'Random request', pin: true },
    { value: 'folderID', label: 'Internal ID (Keys)' },
    { value: 'immat', label: 'Plate' },
    { value: 'vin', label: 'VIN' },
    { value: 'clientID', label: 'Codigo Cliente' },
  ],
  SetClients: [
    { value: 'random', label: 'Random request', pin: true },
    { value: 'clientID', label: 'Codigo Cliente' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'companyName', label: 'Company Name' },
    { value: 'city', label: 'City' },
    { value: 'mobilePhone', label: 'Mobile Phone' },
    { value: 'email', label: 'Email' },
  ],
  SetEvents: [
    { value: 'random', label: 'Random request', pin: true },
    { value: 'subscriberID', label: 'Subscriber ID' },
    { value: 'eventBusID', label: 'IDEventBus' },
  ],
}

const getSearchModes = (queryType) => SEARCH_MODES_BY_QUERY[queryType] || SEARCH_MODES_BY_QUERY.SetRepairOrder

const getFieldConfig = (queryType, searchMode) => {
  if (queryType === 'SetWorkShopAppointmentV2') {
    if (searchMode === 'folderID') return { label: 'Internal appointment ID (Keys)', placeholder: 'e.g. 001|431994', historyKey: 'ws_appt' }
    if (searchMode === 'immat') return { label: 'License plate', placeholder: 'e.g. AB-123-CD or AB123CD', historyKey: 'ws_plate' }
    if (searchMode === 'vin') return { label: 'VIN', placeholder: 'e.g. WME4533421K232068', historyKey: 'ws_vin' }
  }

  if (queryType === 'SetClients') {
    if (searchMode === 'clientID') return { label: 'Codigo Cliente', placeholder: 'e.g. 762745', historyKey: 'sc_clientID' }
    if (searchMode === 'lastName') return { label: 'Last Name', placeholder: 'e.g. AFARSIOU', historyKey: 'sc_lastName' }
    if (searchMode === 'companyName') return { label: 'Company Name', placeholder: 'e.g. PROTEC', historyKey: 'sc_companyName' }
    if (searchMode === 'city') return { label: 'City', placeholder: 'e.g. GOMETZ LA VILLE', historyKey: 'sc_city' }
    if (searchMode === 'mobilePhone') return { label: 'Mobile Phone', placeholder: 'e.g. 0624786994', historyKey: 'sc_phone' }
    if (searchMode === 'email') return { label: 'Email', placeholder: 'e.g. batipros@outlook.com', historyKey: 'sc_email' }
  }

  if (queryType === 'SetEvents') {
    if (searchMode === 'subscriberID') return { label: 'Subscriber ID', placeholder: 'e.g. 495F14CD-47EE-457F-AFFF-F7967AA4C49C', historyKey: 'ev_subscriberID' }
    if (searchMode === 'eventBusID') return { label: 'IDEventBus', placeholder: 'e.g. 7775030', historyKey: 'ev_eventBusID' }
  }

  if (searchMode === 'clientID') return { label: 'Codigo Cliente', placeholder: 'e.g. 1048562', historyKey: 'clientID' }
  if (searchMode === 'random') return { label: '', placeholder: '', historyKey: '' }

  // SetRepairOrder
  if (searchMode === 'folderID') return { label: 'Internal folder ID (Keys)', placeholder: 'e.g. 001|404299', historyKey: 'interne' }
  if (searchMode === 'immat') return { label: 'License plate', placeholder: 'e.g. AB-123-CD or AB123CD', historyKey: 'immat' }
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

export default function SearchBar({ requests, onResult, totalCount, logStart, logEnd, lastResult, onOpenRawRequest, fileVersion, onQueryTypeChange }) {
  const [queryType, setQueryType] = useState('SetRepairOrder')
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

  const { failedCount, errorCount } = useMemo(() => {
    if (queryType === 'SetRepairOrder') {
      const typed = requests.filter(r => r._queryType === 'SetRepairOrder')
      const failed = typed.filter(r => {
        const resp = r._response
        if (!resp || resp.Status !== 'FAIL') return false
        return (resp.Warnings || []).some(w => w.Severity > 0)
      })
      let errors = 0
      for (const r of failed) {
        const msgs = new Set((r._response.Warnings || []).filter(w => w.Severity > 0).map(w => (w.ErrorMessage || '').trim()).filter(Boolean))
        errors += msgs.size
      }
      return { failedCount: failed.length, errorCount: errors }
    }
    if (queryType === 'SetEvents') {
      const typed = requests.filter(r => r._queryType === 'SetEvents')
      const failed = typed.filter(r => (r.Events || []).some(e => String(e.Status) === '-1'))
      const msgs = new Set()
      for (const r of failed) {
        for (const e of (r.Events || [])) {
          if (String(e.Status) === '-1' && e.Message) msgs.add(e.Message.trim())
        }
      }
      return { failedCount: failed.length, errorCount: msgs.size }
    }
    return { failedCount: 0, errorCount: 0 }
  }, [requests, queryType])

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
    if (fileVersion > 0) setSearchHistory([])
  }, [fileVersion])

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
    if (obj === null || typeof obj !== 'object') {
      setRawError('The JSON must be an object or array.')
      return
    }
    if (Array.isArray(obj)) obj = { Items: obj }
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
      const normalizedInput = label.replace(/-/g, '')
      const normalize = (val) => (val || '').toUpperCase().replace(/-/g, '')
      if (queryType === 'SetWorkShopAppointmentV2') {
        found = typedRequests.filter((r) => normalize(r.Vehicle?.RegistrationNumber || r.RegistrationNumber) === normalizedInput)
        saveToHistory('ws_plate', searchValue.trim())
      } else {
        found = typedRequests.filter((r) => normalize(r.VehicleRegistrationNumber) === normalizedInput)
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
    } else if (searchMode === 'clientID') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => String(r.InternalClientID || '') === label)
      saveToHistory(queryType === 'SetClients' ? 'sc_clientID' : 'clientID', searchValue.trim())
    } else if (searchMode === 'lastName') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.LastName || '').toLowerCase().includes(label.toLowerCase()))
      saveToHistory('sc_lastName', label)
    } else if (searchMode === 'companyName') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.CompanyName || '').toLowerCase().includes(label.toLowerCase()))
      saveToHistory('sc_companyName', label)
    } else if (searchMode === 'city') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.Addresses || []).some(a => (a.City || '').toLowerCase().includes(label.toLowerCase())))
      saveToHistory('sc_city', label)
    } else if (searchMode === 'mobilePhone') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.Communications || []).some(c => c.Mode === 'phone' && c.Usage === 'Mobile' && (c.Value || '').includes(label)))
      saveToHistory('sc_phone', label)
    } else if (searchMode === 'email') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter((r) => (r.Communications || []).some(c => c.Mode === 'email' && (c.Value || '').toLowerCase().includes(label.toLowerCase())))
      saveToHistory('sc_email', label)
    } else if (searchMode === 'subscriberID') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter(r => (r.IdSubscriber || '').toLowerCase() === label.toLowerCase())
      saveToHistory('ev_subscriberID', label)
    } else if (searchMode === 'eventBusID') {
      if (!searchValue.trim()) return
      label = searchValue.trim()
      found = typedRequests.filter(r => (r.Events || []).some(e => String(e.IdEventBus || '') === label))
      saveToHistory('ev_eventBusID', label)
    } else if (searchMode === 'random') {
      if (typedRequests.length === 0) return
      const pick = typedRequests[Math.floor(Math.random() * typedRequests.length)]
      label = pick.InternalFolderID || pick.InternalAppointmentID || pick.InternalClientID || pick._scope?.slice(0, 8) || 'random'
      found = [pick]
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

  const isSearchDisabled = requests.length === 0 || (searchMode !== 'random' && !searchValue.trim())

  const typedTotal = queryType ? requests.filter(r => r._queryType === queryType).length : requests.length
  const { placeholder: searchPlaceholder, label: searchLabel, historyKey } = getFieldConfig(queryType, searchMode)

  return (
    <div className="search-section">
      <div className="search-three-col">

        {/* Col 1 — Query type + Convert to JSON */}
        <div className="search-col-query">
          <div className="search-block block-query" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.8rem' }}>
            <div className="field">
              <label>Query type</label>
              <CustomSelect
                options={QUERY_TYPES}
                value={queryType}
                onChange={(val) => { setQueryType(val); if (onQueryTypeChange) onQueryTypeChange(val) }}
              />
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

              {searchMode === 'random' ? (
                <div className="field search-value-field random-hint">
                  <span>Perfect for testing the file!</span>
                </div>
              ) : (
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
              )}
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
            <button className="search-btn search-btn-red" onClick={handleApiSearch} disabled={isSearchDisabled}>Let's go 🔥</button>
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
                        <span className={result.found.length === 0 ? 'terminal-warn' : 'terminal-value'}>{result.found.length} found{result.found.length === 0 ? ' ⚠' : ''}</span>
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