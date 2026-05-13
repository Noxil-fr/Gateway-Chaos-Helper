import { useState, useRef, useEffect, createContext, useContext } from 'react'

const JsonNavCtx = createContext({ forceOpen: new Set() })

function JsonString({ value }) {
  return <span className="json-str">"{value}"</span>
}

function JsonPrimitive({ value }) {
  if (value === null) return <span className="json-null">null</span>
  if (typeof value === 'boolean') return <span className="json-bool">{String(value)}</span>
  if (typeof value === 'number') return <span className="json-num">{value}</span>
  return <JsonString value={value} />
}

function JsonNode({ value, depth = 0, path = '', collapsePaths = new Set() }) {
  const defaultCollapsed = collapsePaths.has(path)
  if (Array.isArray(value)) return <JsonArray value={value} depth={depth} path={path} collapsePaths={collapsePaths} defaultCollapsed={defaultCollapsed} />
  if (value !== null && typeof value === 'object') return <JsonObject value={value} depth={depth} path={path} collapsePaths={collapsePaths} defaultCollapsed={defaultCollapsed} />
  return <JsonPrimitive value={value} />
}

function CollapseBtn({ collapsed, onClick }) {
  return <button className="json-collapse-btn" onClick={onClick}>{collapsed ? '▶' : '▼'}</button>
}

function JsonObject({ value, depth, path, collapsePaths, defaultCollapsed }) {
  const { forceOpen } = useContext(JsonNavCtx)
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed)

  useEffect(() => {
    if (forceOpen.has(path)) setCollapsed(false)
  }, [forceOpen, path])

  const entries = Object.entries(value)
  if (entries.length === 0) return <span className="json-brace">{'{}'}</span>
  return (
    <span className="json-expandable" id={path ? `jv-${path}` : undefined}>
      <CollapseBtn collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
      <span className="json-brace">{'{'}</span>
      {collapsed ? (
        <span className="json-collapsed-hint" onClick={() => setCollapsed(false)}>
          {entries.length} {entries.length > 1 ? 'fields' : 'field'} …
        </span>
      ) : (
        <div className="json-children">
          {entries.map(([k, v], i) => (
            <div key={k} className="json-row">
              <span className="json-key">"{k}"</span>
              <span className="json-colon">: </span>
              <JsonNode value={v} depth={depth + 1} path={path ? `${path}.${k}` : k} collapsePaths={collapsePaths} />
              {i < entries.length - 1 && <span className="json-comma">,</span>}
            </div>
          ))}
        </div>
      )}
      <span className="json-brace">{'}'}</span>
    </span>
  )
}

function JsonArray({ value, depth, path, collapsePaths, defaultCollapsed }) {
  const { forceOpen } = useContext(JsonNavCtx)
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed)

  useEffect(() => {
    if (forceOpen.has(path)) setCollapsed(false)
  }, [forceOpen, path])

  if (value.length === 0) return <span className="json-brace">{'[]'}</span>
  return (
    <span className="json-expandable" id={path ? `jv-${path}` : undefined}>
      <CollapseBtn collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
      <span className="json-brace">{'['}</span>
      {collapsed ? (
        <span className="json-collapsed-hint" onClick={() => setCollapsed(false)}>
          {value.length} item{value.length > 1 ? 's' : ''} …
        </span>
      ) : (
        <div className="json-children">
          {value.map((v, i) => (
            <div key={i} className="json-row">
              <JsonNode value={v} depth={depth + 1} path={`${path}[${i}]`} collapsePaths={collapsePaths} />
              {i < value.length - 1 && <span className="json-comma">,</span>}
            </div>
          ))}
        </div>
      )}
      <span className="json-brace">{']'}</span>
    </span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return <button className="copy-btn" onClick={handle}>{copied ? '✓ Copied' : '⎘ Copy'}</button>
}

function JsonBlock({ obj, navTarget, forceOpen }) {
  const clean = Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('_')))
  const pretty = JSON.stringify(clean, null, 2)
  const collapsePaths = new Set()
  if (obj?._queryType === 'SetWorkShopAppointmentV2') {
    collapsePaths.add('Client.Consents')
  }
  if (obj?._queryType === 'SetClients') {
    collapsePaths.add('Consents')
  }

  useEffect(() => {
    if (!navTarget) return
    const attempt = (remaining) => {
      const el = document.getElementById(`jv-${navTarget.path}`)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
      if (remaining > 0) setTimeout(() => attempt(remaining - 1), 50)
    }
    setTimeout(() => attempt(6), 80)
  }, [navTarget])

  return (
    <JsonNavCtx.Provider value={{ forceOpen: forceOpen || new Set() }}>
      <div className="json-block">
        <div className="json-block-toolbar"><CopyButton text={pretty} /></div>
        <div className="json-viewer"><JsonNode value={clean} depth={0} path="" collapsePaths={collapsePaths} /></div>
      </div>
    </JsonNavCtx.Provider>
  )
}

function ResponseBlock({ response }) {
  const pretty = JSON.stringify(response, null, 2)
  const isOk = response?.Status === 'OK'
  const warnings = response?.Warnings || []
  return (
    <div className="json-block">
      <div className="json-block-toolbar">
        <div className={`response-badge ${isOk ? 'ok' : 'fail'}`}>{isOk ? '✓ OK' : '✗ FAIL'}</div>
        {warnings.length > 0 && (
          <div className="warning-list">
            {warnings.map((w, i) => (
              <div key={i} className="warning-item">⚠ [{w.ErrorID}] {w.ErrorMessage}</div>
            ))}
          </div>
        )}
        <CopyButton text={pretty} />
      </div>
      <div className="json-viewer"><JsonNode value={response} depth={0} /></div>
    </div>
  )
}

function formatLogMessage(message) {
  const markers = [
    { name: 'SetRepairOrder', marker: 'Call SetRepairOrder Params' },
    { name: 'SetWorkShopAppointmentV2', marker: 'Call SetWorkShopAppointmentV2 Params' },
    { name: 'SetClients', marker: 'Call SetClients Params' },
    { name: 'SetEvents', marker: 'Call SetEvents Params' },
  ]
  const hit = markers.map(m => ({ ...m, idx: message.indexOf(m.marker) })).find(m => m.idx !== -1)
  if (!hit) return { text: message, isRequest: false }
  const objStart = message.indexOf('{', hit.idx)
  const arrStart = message.indexOf('[', hit.idx)
  const jsonStart = (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) ? arrStart : objStart
  if (jsonStart === -1) return { text: message, isRequest: false }
  try {
    const jsonEnd = message[jsonStart] === '[' ? message.lastIndexOf(']') : message.lastIndexOf('}')
    const payload = JSON.parse(message.slice(jsonStart, jsonEnd + 1))
    if (hit.name === 'SetRepairOrder') {
      const obj = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}
      const folderID = obj.InternalFolderID || ''
      return { isRequest: true, preview: `Call SetRepairOrder Params {"InternalFolderID":"${folderID}"` }
    }
    const first = Array.isArray(payload) ? payload[0] : payload
    if (hit.name === 'SetClients') {
      const clientId = first?.InternalClientID || ''
      return { isRequest: true, preview: `Call SetClients Params [{"InternalClientID":"${clientId}"` }
    }
    if (hit.name === 'SetEvents') {
      const obj = Array.isArray(payload) ? payload[0] : payload
      const subscriberId = obj?.IdSubscriber || ''
      return { isRequest: true, preview: `Call SetEvents Params {"IdSubscriber":"${subscriberId}"` }
    }
    const apptId = first?.InternalAppointmentID || ''
    return { isRequest: true, preview: `Call SetWorkShopAppointmentV2 Params [{"InternalAppointmentID":"${apptId}"` }
  } catch {
    return { text: message.slice(0, 80) + '…', isRequest: false }
  }
}

function LogsBlock({ logs }) {
  if (!logs || logs.length === 0) return <div className="empty-state">No logs available for this scope.</div>
  return (
    <div className="scope-log-list">
      {logs.map((log, i) => {
        const { text, isRequest, preview } = formatLogMessage(log.message)
        return (
          <div key={i} className={`scope-log-row level-${log.level?.toLowerCase()}`}>
            <span className="scope-log-time">{log.timestamp?.slice(11, 19) || '—'}</span>
            <span className="scope-log-level">{log.level}</span>
            <span className="scope-log-msg">
              {isRequest ? (
                <>
                  <span className="scope-log-request-preview">{preview} …</span>
                  <span className="scope-log-request-hint"> — full detail in Request tab</span>
                </>
              ) : log.level === 'WARN' ? (
                <>
                  <span>{text}</span>
                  <span className="scope-log-request-hint"> — full detail in Response tab</span>
                </>
              ) : (
                text
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const NAVIGATOR_CONFIGS = {
  SetRepairOrder: {
    jobsKey: 'Jobs',
    jobLabel: (job, i) => job.JobDescr || `Job ${i + 1}`,
    getNavItems: (job) => (job.Packs || []).map((pack, idx) => ({
      label: pack.PackDescr || `Pack ${idx + 1}`,
      pathSegment: `Packs[${idx}]`,
    })),
  },
  SetWorkShopAppointmentV2: {
    jobsKey: 'Job',
    jobLabel: (job, i) => job.JobDescr || `Job ${i + 1}`,
    getNavItems: (job) => (job.Items || [])
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.ItemType === 'Pack')
      .map(({ item, idx }) => ({
        label: item.LineDescr || `Pack ${idx + 1}`,
        pathSegment: `Items[${idx}]`,
      })),
  },
}

function JobNavigator({ jobs, config, onNavigate }) {
  const { jobsKey, jobLabel, getNavItems } = config
  const totalPacks = jobs.reduce((sum, job) => sum + getNavItems(job).length, 0)
  return (
    <div className="job-navigator">
      <div className="job-nav-header">
        <span>Jobs ({jobs.length})</span>
        <span className="job-nav-header-packs">Packs ({totalPacks})</span>
      </div>
      <div className="job-nav-list">
        {jobs.map((job, i) => {
          const navItems = getNavItems(job)
          return (
            <div key={i} className="job-nav-group">
              <div className="job-nav-job" onClick={() => onNavigate(`${jobsKey}[${i}]`)}>
                <span className="job-nav-index">#{i + 1}</span>
                <span className="job-nav-label">{jobLabel(job, i)}</span>
              </div>
              {navItems.map((navItem, j) => (
                <div key={j} className="job-nav-pack" onClick={() => onNavigate(`${jobsKey}[${i}].${navItem.pathSegment}`)}>
                  {navItem.label}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SubTabViewer({ item }) {
  const [activeInner, setActiveInner] = useState('request')
  const [navTarget, setNavTarget] = useState(null)
  const [forceOpen, setForceOpen] = useState(new Set())

  const hasResponse = !!item._response
  const hasLogs = item._scopeLogs && item._scopeLogs.length > 0
  const isOk = item._response?.Status === 'OK'
  const navConfig = NAVIGATOR_CONFIGS[item._queryType] || null
  const jobs = navConfig ? (item[navConfig.jobsKey] || []) : []
  const hasJobs = jobs.length > 0

  const handleNavigate = (path) => {
    const jobsKey = navConfig?.jobsKey || 'Jobs'
    const ancestors = new Set([jobsKey])
    const jobMatch = path.match(new RegExp(`^${jobsKey}\\[(\\d+)\\]`))
    if (jobMatch) {
      const jobPath = `${jobsKey}[${jobMatch[1]}]`
      ancestors.add(jobPath)
      const afterJob = path.slice(jobPath.length)
      if (afterJob) {
        const subKeyMatch = afterJob.match(/^\.(\w+)\[/)
        if (subKeyMatch) ancestors.add(`${jobPath}.${subKeyMatch[1]}`)
      }
    }
    setForceOpen(ancestors)
    setNavTarget({ path, ts: Date.now() })
  }

  return (
    <div>
      <div className="viewer-tab-bar">
        <button className={`viewer-tab ${activeInner === 'request' ? 'active' : ''}`} onClick={() => setActiveInner('request')}>Request</button>
        <button
          className={`viewer-tab ${activeInner === 'response' ? 'active' : ''} ${hasResponse && !isOk ? 'has-fail' : ''}`}
          onClick={() => setActiveInner('response')}
          disabled={!hasResponse}
        >
          Response
          {hasResponse && <span className={`viewer-tab-badge ${isOk ? 'ok' : 'fail'}`}>{isOk ? '✓' : '✗'}</span>}
        </button>
        <button
          className={`viewer-tab ${activeInner === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveInner('logs')}
          disabled={!hasLogs}
        >
          Logs
          {hasLogs && <span className="viewer-tab-count">{item._scopeLogs.length}</span>}
        </button>
      </div>

      {activeInner === 'request' && (
        <div className={hasJobs ? 'viewer-request-layout' : ''}>
          {hasJobs && <JobNavigator jobs={jobs} config={navConfig} onNavigate={handleNavigate} />}
          <JsonBlock obj={item} navTarget={navTarget} forceOpen={forceOpen} />
        </div>
      )}
      {activeInner === 'response' && hasResponse && <ResponseBlock response={item._response} />}
      {activeInner === 'response' && !hasResponse && <div className="empty-state">No response found for this request.</div>}
      {activeInner === 'logs' && <LogsBlock logs={item._scopeLogs} />}
    </div>
  )
}

function ScrollToTopBtn({ targetRef }) {
  const handleClick = () => {
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="scroll-top-wrapper">
      <button className="scroll-top-btn" onClick={handleClick} title="Back to top">↑</button>
    </div>
  )
}

export default function JsonViewer({ result, activeIndex, onSelectIndex }) {
  const panelRef = useRef()

  if (!result) return <div className="empty-state">📋 Load a log file then run a search</div>

  const { internalFolderID, found, totalCount } = result

  if (found.length === 0) {
    return (
      <div className="result-panel" ref={panelRef}>
        <div className="result-meta">
          🔎 Search: <span>{internalFolderID}</span> — <span>0</span> result found out of <span>{totalCount}</span> total requests
        </div>
        <div className="empty-state">❌ No request found for this OR</div>
      </div>
    )
  }

  const currentIndex = activeIndex ?? 0
  const obj = found[currentIndex]

  return (
    <div className="result-panel" ref={panelRef}>
      <div className="result-meta">
        🔎 <span>{internalFolderID}</span> — <span>{found.length}</span> request{found.length > 1 ? 's' : ''} found out of <span>{totalCount}</span> total
        {found.length === 1 && obj._timestamp && <span className="result-meta-time"> · {obj._timestamp.slice(11, 19)}</span>}
      </div>
      {found.length > 1 && (
        <div className="sub-tab-bar">
          {found.map((item, i) => (
            <button key={i} className={`sub-tab ${currentIndex === i ? 'active' : ''}`} onClick={() => onSelectIndex(i)}>
              #{i + 1}
              {item._response && (
                <span className={`sub-tab-status ${item._response.Status === 'OK' ? 'ok' : 'fail'}`}>
                  {item._response.Status === 'OK' ? ' ✓' : ' ✗'}
                </span>
              )}
              {item._timestamp && <span className="sub-tab-time"> {item._timestamp.slice(11, 19)}</span>}
            </button>
          ))}
        </div>
      )}
      <SubTabViewer item={obj} />
      <ScrollToTopBtn targetRef={panelRef} />
    </div>
  )
}
