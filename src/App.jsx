import { useState } from 'react'
import FileUploader from './components/FileUploader'
import SearchBar from './components/SearchBar'
import TabBar from './components/TabBar'
import JsonViewer from './components/JsonViewer'
import ErrorPanel, { SetEventsErrorPanel } from './components/ErrorPanel'
import MainTabs from './components/MainTabs'
import GatewayPanel from './components/GatewayPanel'
import PatchNoteModal from './components/PatchNoteModal'
import SelectionModal from './components/SelectionModal'

let tabCounter = 0
const MAX_SUBTABS = 16
const MAX_TABS = 16

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
  const [activeQueryType, setActiveQueryType] = useState('SetRepairOrder')
  const [mainTab, setMainTab] = useState('analyzer')
  const [showPatchNote, setShowPatchNote] = useState(false)
  const [fileVersion, setFileVersion] = useState(0)
  const [tabError, setTabError] = useState(null)

  const showTabLimit = () => {
    setTabError(`Tab limit reached (${MAX_TABS} max). Close a tab to open a new one.`)
    setTimeout(() => setTabError(null), 4000)
  }


  const handleParsed = (parsed, firstTimestamp, lastTimestamp) => {
    setRequests(parsed)
    setTotalCount(parsed.length)
    setTabs([])
    setActiveTab(null)
    setSubIndexes({})
    setLogStart(firstTimestamp || '')
    setLogEnd(lastTimestamp || '')
    setFileVersion(v => v + 1)
  }

  const openRequestInTab = (req) => {
    const label = req.InternalFolderID || req._scope?.slice(0, 8) || 'unknown'
    const existing = tabs.find((t) => t.internalFolderID === label)
    if (existing) { setActiveTab(existing.id); return }
    if (tabs.length >= MAX_TABS) { showTabLimit(); return }
    const id = ++tabCounter
    setTabs((prev) => [...prev, {
      id, internalFolderID: label, label,
      result: { internalFolderID: label, found: [req], totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const openFoundInTab = (internalFolderID, found) => {
    const existing = tabs.find((t) => t.internalFolderID === internalFolderID)
    if (existing) { setActiveTab(existing.id); return }
    if (tabs.length >= MAX_TABS) { showTabLimit(); return }
    const id = ++tabCounter
    setTabs((prev) => [...prev, {
      id, internalFolderID, label: internalFolderID,
      result: { internalFolderID, found, totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const handleResult = ({ internalFolderID, found, totalCount }) => {
    setLastResult({ internalFolderID, found, totalCount })
    if (found.length === 0) return
    if (found.length > MAX_SUBTABS) {
      setPopup({ internalFolderID, found })
      return
    }
    openFoundInTab(internalFolderID, found)
  }

  const handleSelectionConfirm = (selectedItems) => {
    setPopup(null)
    if (selectedItems.length === 0) return
    const internalFolderID = popup.internalFolderID
    const existing = tabs.find((t) => t.internalFolderID === internalFolderID)
    if (existing) { setActiveTab(existing.id); return }
    if (tabs.length >= MAX_TABS) { showTabLimit(); return }
    const id = ++tabCounter
    setTabs((prev) => [...prev, {
      id, internalFolderID, label: internalFolderID,
      result: { internalFolderID, found: selectedItems, totalCount },
    }])
    setActiveTab(id)
    setSubIndexes((prev) => ({ ...prev, [id]: 0 }))
  }

  const openRawRequestInTab = (rawObj) => {
    if (tabs.length >= MAX_TABS) { showTabLimit(); return }
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
        <h1>Gateway Chaos Helper <span className="version">v1.3</span><button className="patchnote-btn" onClick={() => setShowPatchNote(true)}>Read me</button></h1>
      </div>

      <FileUploader onParsed={handleParsed} />

      <MainTabs activeTab={mainTab} onTabChange={setMainTab} />

      <div style={{ display: mainTab === 'analyzer' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
        <SearchBar
          requests={requests}
          onResult={handleResult}
          totalCount={totalCount}
          logStart={logStart}
          logEnd={logEnd}
          lastResult={lastResult}
          onOpenRawRequest={openRawRequestInTab}
          fileVersion={fileVersion}
          onQueryTypeChange={setActiveQueryType}
        />

        {activeQueryType === 'SetRepairOrder' && (
          <ErrorPanel
            requests={requests}
            onOpenRequest={openRequestInTab}
            visible={true}
          />
        )}
        {activeQueryType === 'SetEvents' && (
          <SetEventsErrorPanel
            requests={requests}
            onOpenRequest={openRequestInTab}
            visible={true}
          />
        )}

        <div className="results-section-header">
          <span className="results-section-title">Results</span>
          <hr className="results-section-divider" />
        </div>

        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onSelect={setActiveTab}
          onClose={handleCloseTab}
        />

        {tabError && <div className="tab-limit-error">{tabError}</div>}

        <JsonViewer
          result={activeResult}
          activeIndex={activeIndex}
          onSelectIndex={(i) => handleSelectSubIndex(activeTab, i)}
        />
      </div>

      <div style={{ display: mainTab === 'gateway' ? '' : 'none' }}>
        <GatewayPanel />
      </div>

      {showPatchNote && <PatchNoteModal onClose={() => setShowPatchNote(false)} />}

      {popup && (
        <SelectionModal
          internalFolderID={popup.internalFolderID}
          found={popup.found}
          totalCount={totalCount}
          onConfirm={handleSelectionConfirm}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
