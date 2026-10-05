import { useState } from 'react'
import { getRepairOrderErrors, normalizeErrorMessage } from '../utils/repairOrderErrors'

// ─── SetRepairOrder ───────────────────────────────────────────────────────────

function groupErrors(requests) {
  const groups = {}
  for (const req of requests) {
    for (const message of getRepairOrderErrors(req._response, req._logErrors)) {
      if (!groups[message]) groups[message] = []
      if (!groups[message].find(r => r._scope === req._scope)) groups[message].push(req)
    }
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([message, reqs]) => ({ message, reqs }))
}

function RequestRow({ req, message, onOpen }) {
  const emp = req.RecptionistIDIn || req.RecptionistIDOut || '—'
  const folder = req.InternalFolderID || '—'
  const time = req._timestamp ? req._timestamp.slice(11, 19) : '—'
  const scope = req._scope || '—'
  // The group shows the masked log error: give back the actual value (e.g. the ItemID that overflowed)
  const detail = (req._logErrors || []).find(e => e !== message && normalizeErrorMessage(e) === message)
  return (
    <div className="error-req-row">
      <div className="error-req-info">
        <span className="error-req-folder">{folder}</span>
        <span className="error-req-emp">{emp}</span>
        <span className="error-req-time">{time}</span>
        <span className="error-req-scope">{scope}</span>
        {detail && <span className="error-req-scope">{detail}</span>}
      </div>
      <button className="error-req-open" onClick={() => onOpen(req)}>Open in result</button>
    </div>
  )
}

function ErrorGroup({ group, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="error-group">
      <div className="error-group-header" onClick={() => setExpanded(e => !e)}>
        <span className="error-group-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="error-group-message">{group.message}</span>
        <span className="error-group-count">{group.reqs.length}</span>
      </div>
      {expanded && (
        <div className="error-group-body">
          {group.reqs.map((req, i) => <RequestRow key={i} req={req} message={group.message} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

function ErrorPanelShell({ title, badge, errorsBadge, children, visible, variant }) {
  const [collapsed, setCollapsed] = useState(true)
  if (!visible) return null
  return (
    <div className={`error-panel-section${variant ? ` ${variant}` : ''}`}>
      <div className="error-panel-header">
        <span className="error-panel-icon">⚠</span>
        <span className="error-panel-title">{title}</span>
        {errorsBadge}
        <span className="error-panel-types-badge">{badge}</span>
        <button className="error-panel-toggle" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '▶ Show' : '▼ Hide'}
        </button>
      </div>
      {!collapsed && <div className="error-group-list">{children}</div>}
    </div>
  )
}

export default function ErrorPanel({ requests, onOpenRequest, visible }) {
  if (!visible || !requests || requests.length === 0) return null
  const groups = groupErrors(requests)
  const uniqueScopes = new Set(groups.flatMap(g => g.reqs.map(r => r._scope || r._timestamp)))
  const failCount = uniqueScopes.size
  const failHitCount = groups.reduce((acc, g) => acc + g.reqs.length, 0)
  if (failCount === 0) return null

  return (
    <ErrorPanelShell
      visible={true}
      title={<><strong>{failCount}</strong> failed SetRepairOrder request{failCount > 1 ? 's' : ''} detected</>}
      badge={`${groups.length} error type${groups.length > 1 ? 's' : ''}`}
      errorsBadge={failHitCount !== failCount && (
        <span className="error-panel-errors-badge" title="Total errors detected (across error types)">
          {failHitCount} errors
        </span>
      )}
    >
      {groups.map((group, i) => <ErrorGroup key={i} group={group} onOpen={onOpenRequest} />)}
    </ErrorPanelShell>
  )
}

// ─── SetEvents ────────────────────────────────────────────────────────────────

function groupSetEventsErrors(requests) {
  const groups = {}
  for (const req of requests) {
    if (req._queryType !== 'SetEvents') continue
    const failing = (req.Events || []).filter(e => String(e.Status) === '-1')
    const seen = new Set()
    for (const e of failing) {
      const message = e.Message || 'Unknown error'
      if (seen.has(message)) continue
      seen.add(message)
      if (!groups[message]) groups[message] = []
      if (!groups[message].find(r => r._scope === req._scope)) groups[message].push(req)
    }
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([message, reqs]) => ({ message, reqs }))
}

function SetEventsRequestRow({ req, onOpen }) {
  const subscriber = req.IdSubscriber ? req.IdSubscriber.slice(0, 8) + '…' : '—'
  const time = req._timestamp ? req._timestamp.slice(11, 19) : '—'
  const scope = req._scope || '—'
  const failCount = (req.Events || []).filter(e => String(e.Status) === '-1').length
  return (
    <div className="error-req-row">
      <div className="error-req-info">
        <span className="error-req-folder">{subscriber}</span>
        <span className="error-req-emp">{failCount} event{failCount > 1 ? 's' : ''}</span>
        <span className="error-req-time">{time}</span>
        <span className="error-req-scope">{scope}</span>
      </div>
      <button className="error-req-open" onClick={() => onOpen(req)}>Open in result</button>
    </div>
  )
}

function SetEventsErrorGroup({ group, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="error-group">
      <div className="error-group-header" onClick={() => setExpanded(e => !e)}>
        <span className="error-group-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="error-group-message">{group.message}</span>
        <span className="error-group-count">{group.reqs.length}</span>
      </div>
      {expanded && (
        <div className="error-group-body">
          {group.reqs.map((req, i) => <SetEventsRequestRow key={i} req={req} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

export function SetEventsErrorPanel({ requests, onOpenRequest, visible }) {
  if (!visible || !requests || requests.length === 0) return null
  const groups = groupSetEventsErrors(requests)
  const uniqueScopes = new Set(groups.flatMap(g => g.reqs.map(r => r._scope || r._timestamp)))
  const failCount = uniqueScopes.size
  if (failCount === 0) return null

  return (
    <ErrorPanelShell
      visible={true}
      title={<><strong>{failCount}</strong> failed SetEvents request{failCount > 1 ? 's' : ''} detected</>}
      badge={`${groups.length} error type${groups.length > 1 ? 's' : ''}`}
    >
      {groups.map((group, i) => <SetEventsErrorGroup key={i} group={group} onOpen={onOpenRequest} />)}
    </ErrorPanelShell>
  )
}

// ─── Raw ERROR / WARN log lines ───────────────────────────────────────────────

function groupLogIssues(issues) {
  const groups = {}
  for (const issue of issues) {
    // Response warnings are already generic ("[99] Vehicle without paint ingredient…"): masking would hide their ErrorID
    const message = issue._fromResponse ? issue.message : normalizeErrorMessage(issue.message)
    const key = `${issue.level}|${message}`
    if (!groups[key]) groups[key] = { level: issue.level, message, issues: [] }
    groups[key].issues.push(issue)
  }
  return Object.values(groups).sort((a, b) =>
    (a.level === 'ERROR' ? 0 : 1) - (b.level === 'ERROR' ? 0 : 1) || b.issues.length - a.issues.length)
}

function LogIssueRow({ issue, showMessage, onOpen }) {
  const source = issue.source ? issue.source.split('.').pop() : '—'
  const time = issue.timestamp ? issue.timestamp.slice(11, 19) : '—'
  const req = issue._request
  const target = req?._queryType || source
  return (
    <div className="error-req-row">
      <div className="error-req-info">
        <span className="error-req-folder">{req?.InternalFolderID || target}</span>
        {req?.InternalFolderID && <span className="error-req-emp">{target}</span>}
        <span className="error-req-time">{time}</span>
        <span className="error-req-scope">{issue.scope || '—'}</span>
        {showMessage && <span className="error-req-scope">{issue.message}</span>}
      </div>
      {req && <button className="error-req-open" onClick={() => onOpen(req)}>Open in result</button>}
    </div>
  )
}

function LogIssueGroup({ group, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  const showMessage = group.issues.some(i => i.message !== group.message)
  return (
    <div className="error-group">
      <div className="error-group-header" onClick={() => setExpanded(e => !e)}>
        <span className="error-group-toggle">{expanded ? '▼' : '▶'}</span>
        <span className={`error-group-level level-${group.level.toLowerCase()}`}>{group.level === 'WARN' ? '⚠' : group.level}</span>
        <span className="error-group-message">{group.message}</span>
        <span className="error-group-count">{group.issues.length}</span>
      </div>
      {expanded && (
        <div className="error-group-body">
          {group.issues.map((issue, i) => <LogIssueRow key={i} issue={issue} showMessage={showMessage} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}

export function LogIssuesPanel({ issues, onOpenRequest }) {
  if (!issues || issues.length === 0) return null
  const groups = groupLogIssues(issues)
  const errorCount = issues.filter(i => i.level === 'ERROR').length
  const warnCount = issues.length - errorCount

  const parts = []
  if (warnCount > 0) parts.push(<><strong>{warnCount}</strong> response warning{warnCount > 1 ? 's' : ''}</>)
  if (errorCount > 0) parts.push(<><strong>{errorCount}</strong> log error{errorCount > 1 ? 's' : ''}</>)

  // Non-blocking: styled apart from the FAIL panel so it does not read as failed requests
  return (
    <ErrorPanelShell
      visible={true}
      variant="warn"
      title={<>{parts.map((p, i) => <span key={i}>{i > 0 && ' / '}{p}</span>)}</>}
      badge={`${groups.length} message type${groups.length > 1 ? 's' : ''}`}
    >
      {groups.map((group, i) => <LogIssueGroup key={i} group={group} onOpen={onOpenRequest} />)}
    </ErrorPanelShell>
  )
}
