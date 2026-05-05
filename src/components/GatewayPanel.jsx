import { useState, useRef, useEffect } from 'react'
import { fetchSubscriberData, fetchClientData, fetchClients } from '../services/api'
import CustomSelect from './CustomSelect'

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

  const handleCheck = async () => {
    if (loading) return
    if (!subscriberInput.trim() && !selectedClient) return
    setLoading(true)
    setError(null)
    try {
      let data, label
      if (selectedClient) {
        data = await fetchClientData(selectedClient)
        label = selectedClient
      } else {
        data = await fetchSubscriberData(subscriberInput.trim())
        label = subscriberInput.trim()
      }
      setResults(prev => [...prev, { client: label, ...data }])
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
            <CustomSelect
              options={clients.map(c => ({ value: c, label: c }))}
              value={selectedClient}
              onChange={(val) => { setSelectedClient(val); setSubscriberInput('') }}
              disabled={clients.length === 0}
              searchable
            />
          </div>

          <button
            className="search-btn"
            onClick={handleCheck}
            disabled={(!subscriberInput.trim() && !selectedClient) || loading}
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
