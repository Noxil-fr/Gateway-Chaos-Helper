import { useState, useRef, useEffect } from 'react'
import { fetchSubscriberData, fetchClients } from '../services/api'

function ClientDropdown({ clients, value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="client-dropdown" ref={ref}>
      <button
        className={`client-dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        type="button"
      >
        <span>{value || '— Select a client —'}</span>
        <span className="client-dropdown-arrow">▾</span>
      </button>
      {open && (
        <div className="client-dropdown-list">
          <div
            className={`client-dropdown-option ${value === '' ? 'selected' : ''}`}
            onMouseDown={() => { onChange(''); setOpen(false) }}
          >
            — Select a client —
          </div>
          {clients.map(c => (
            <div
              key={c.subscriber}
              className={`client-dropdown-option ${value === c.name ? 'selected' : ''}`}
              onMouseDown={() => { onChange(c.name); setOpen(false) }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GatewayPanel() {
  const [clients, setClients] = useState([])
  const [subscriberInput, setSubscriberInput] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef()

  useEffect(() => {
    fetchClients().then(setClients).catch(() => {})
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [results])

  const activeSubscriber = subscriberInput.trim() ||
    (clients.find(c => c.name === selectedClient)?.subscriber || '')

  const handleCheck = async () => {
    if (!activeSubscriber || loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSubscriberData(activeSubscriber)
      setResults(prev => [...prev, {
        client: selectedClient || activeSubscriber,
        subscriberID: activeSubscriber,
        ...data,
      }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleCheck() }

  return (
    <div className="gateway-panel">

      <div className="gateway-form">
        <div className="search-block block-query" style={{ height: '100%' }}>

          <div className="field">
            <label>Subscriber ID</label>
            <input
              type="text"
              value={subscriberInput}
              onChange={(e) => { setSubscriberInput(e.target.value); setSelectedClient('') }}
              onKeyDown={handleKey}
              placeholder="e.g. SUB-12345"
            />
          </div>

          <div className="gateway-or-separator">
            <span>— OR —</span>
          </div>

          <div className="field">
            <label>Client</label>
            <ClientDropdown
              clients={clients}
              value={selectedClient}
              onChange={(val) => { setSelectedClient(val); setSubscriberInput('') }}
              disabled={clients.length === 0}
            />
          </div>

          <button
            className="search-btn"
            onClick={handleCheck}
            disabled={!activeSubscriber || loading}
          >
            {loading ? 'Searching...' : 'Check 🔍'}
          </button>

          {error && <div className="inline-error">{error}</div>}

        </div>
      </div>

      <div className="gateway-terminal-col">
        <div className="terminal">
          <div className="terminal-body">
            {results.length === 0 ? (
              <span className="terminal-muted">Waiting for a search...</span>
            ) : (
              <div className="terminal-scroll" ref={scrollRef}>
                {results.map((r, idx) => (
                  <div key={idx} className="terminal-result-block">
                    {idx > 0 && <div style={{ borderTop: '1px solid #2a2a2a', margin: '0.3rem 0' }} />}
                    <div><span className="terminal-key">Client&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{r.client}</span></div>
                    <div><span className="terminal-key">Subscriber&nbsp;&nbsp;</span><span className="terminal-value">{r.subscriberID}</span></div>
                    <div><span className="terminal-key">Version&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{r.version}</span></div>
                    <div><span className="terminal-key">DMS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{r.dms}</span></div>
                    <div><span className="terminal-key">Provider&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="terminal-value">{r.provider}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
