import { useState, useMemo } from 'react'
import FileUploader from './components/FileUploader'
import SearchBar from './components/SearchBar'
import TabBar from './components/TabBar'
import JsonViewer from './components/JsonViewer'
import ErrorPanel from './components/ErrorPanel'
import MainTabs from './components/MainTabs'
import GatewayPanel from './components/GatewayPanel'
import PatchNoteModal from './components/PatchNoteModal'

let tabCounter = 0
const MAX_SUBTABS = 8

export default function App() {
  const [requests, setRequests] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [subIndexes, setSubIndexes] = useState({})
  const [logStart, setLogStart] = useState('')
  const [logEnd, setLogEnd] = useState('')
  const [popup, setPopup] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [showErrors, setShowErrors] = useState(true)
  const [mainTab, setMainTab] = useState('analyzer')
  const [showPatchNote, setShowPatchNote] = useState(false)

  // Count failed requests (with severity > 0 warnings)
  const failedCount = useMemo(() => {
    return requests.filter(r => {
      const resp = r._response
      if (!resp || resp.Status !== 'FAIL') return false
      const warnings = resp.Warnings || []
      return warnings.some(w => w.Severity > 0)
    }).length
  }, [requests])

  // Count detected errors (sum of unique warning messages per failed request)
  const errorCount = useMemo(() => {
    let total = 0
    for (const r of requests) {
      const resp = r._response
      if (!resp || resp.Status !== 'FAIL') continue
      const warnings = resp.Warnings || []
      const messages = new Set(
        warnings
          .filter(w => w.Severity > 0)
          .map(w => (w.ErrorMessage || 'Unknown warning').trim())
          .filter(Boolean),
      )
      total += messages.size
    }
    return total
  }, [requests])

  const handleParsed = (parsed, firstTimestamp, lastTimestamp) => {
    setRequests(parsed)
    setTotalCount(parsed.length)
    setTabs([])
    setActiveTab(null)
    setSubIndexes({})
    setLogStart(firstTimestamp || '')
    setLogEnd(lastTimestamp || '')
  }

  const openRequestInTab = (req) => {
    const label = req.InternalFolderID || req._scope?.slice(0, 8) || 'unknown'
    const existing = tabs.find((t) => t.internalFolderID === label)
    if (existing) { setActiveTab(existing.id); return }
    const id = ++tabCounter
    setTabs((prev) => [...prev, {
      id, internalFolderID: label, label,
      result: { internalFolderID: label, found: [req], totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const handleResult = ({ internalFolderID, found, totalCount }) => {
    setLastResult({ internalFolderID, found, totalCount })
    if (found.length > MAX_SUBTABS) {
      setPopup({ internalFolderID, count: found.length })
      return
    }
    const existing = tabs.find((t) => t.internalFolderID === internalFolderID)
    if (existing) { setActiveTab(existing.id); return }
    const id = ++tabCounter
    setTabs((prev) => [...prev, {
      id, internalFolderID, label: internalFolderID,
      result: { internalFolderID, found, totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const openRawRequestInTab = (rawObj) => {
    const id = ++tabCounter
    const internalFolderID = `RAW-${id}`
    const req = {
      ...rawObj,
      _timestamp: new Date().toISOString(),
      _scope: `raw-${id}`,
    }
    setTabs((prev) => [...prev, {
      id,
      internalFolderID,
      label: internalFolderID,
      result: { internalFolderID, found: [req], totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const handleCloseTab = (id) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (activeTab === id) setActiveTab(next.length > 0 ? next[next.length - 1].id : null)
      return next
    })
    setSubIndexes((prev) => { const next = { ...prev }; delete next[id]; return next })
  }

  const handleSelectSubIndex = (tabId, index) => {
    setSubIndexes((prev) => ({ ...prev, [tabId]: index }))
  }

  const activeTabData = tabs.find((t) => t.id === activeTab)
  const activeResult = activeTabData?.result ?? null
  const activeIndex = activeTab !== null ? (subIndexes[activeTab] ?? 0) : 0

  return (
    <div className="app">
      <div className="header">
        <h1>Gateway Chaos Helper <span className="version">v1.1</span><button className="patchnote-btn" onClick={() => setShowPatchNote(true)}>Patch note</button></h1>
      </div>

      <FileUploader onParsed={handleParsed} />

      <MainTabs activeTab={mainTab} onTabChange={setMainTab} />

      {mainTab === 'analyzer' && (
        <>
          <SearchBar
            requests={requests}
            onResult={handleResult}
            totalCount={totalCount}
            logStart={logStart}
            logEnd={logEnd}
            lastResult={lastResult}
            onShowErrorsChange={setShowErrors}
            failedCount={failedCount}
            errorCount={errorCount}
            onOpenRawRequest={openRawRequestInTab}
          />

          <ErrorPanel
            requests={requests}
            onOpenRequest={openRequestInTab}
            visible={showErrors}
          />

          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            onClose={handleCloseTab}
          />

          <JsonViewer
            result={activeResult}
            activeIndex={activeIndex}
            onSelectIndex={(i) => handleSelectSubIndex(activeTab, i)}
          />
        </>
      )}

      {mainTab === 'gateway' && (
        <GatewayPanel />
      )}

      {showPatchNote && <PatchNoteModal onClose={() => setShowPatchNote(false)} />}

      {popup && (
        <div className="popup-overlay" onClick={() => setPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-title">⚠️ Too many results</div>
            <p><strong>{popup.count}</strong> requests found for <code>{popup.internalFolderID}</code>.</p>
            <p>
              Display is limited to <strong>{MAX_SUBTABS} sub-tabs</strong>.<br />
              Please refine your search using the <strong>Start time</strong> and <strong>End time</strong> filters.
            </p>
            <button className="popup-close" onClick={() => setPopup(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
