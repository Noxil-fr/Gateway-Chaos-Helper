import { useState } from 'react'

function groupErrors(requests) {
  const groups = {}
  for (const req of requests) {
    const resp = req._response
    if (!resp || resp.Status !== 'FAIL') continue
    const warnings = resp.Warnings || []
    const relevantWarnings = warnings.filter(w => w.Severity > 0)
    if (relevantWarnings.length === 0) continue
    const seenMessages = new Set()
    for (const w of relevantWarnings) {
      const message = w.ErrorMessage || 'Unknown warning'
      if (seenMessages.has(message)) continue
      seenMessages.add(message)
      if (!groups[message]) groups[message] = []
      if (!groups[message].find(r => r._scope === req._scope)) {
        groups[message].push(req)
      }
    }
  }
  return Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([message, reqs]) => ({ message, reqs }))
}

function RequestRow({ req, onOpen }) {
  const emp = req.RecptionistIDIn || req.RecptionistIDOut || '—'
  const folder = req.InternalFolderID || '—'
  const time = req._timestamp ? req._timestamp.slice(11, 19) : '—'
  const scope = req._scope || '—'
  return (
    <div className="error-req-row">
      <div className="error-req-info">
        <span className="error-req-folder">{folder}</span>
        <span className="error-req-emp">{emp}</span>
        <span className="error-req-time">{time}</span>
        <span className="error-req-scope">{scope}</span>
      </div>
      <button className="error-req-open" onClick={() => onOpen(req)}>Open</button>
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
          {group.reqs.map((req, i) => (
            <RequestRow key={i} req={req} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ErrorPanel({ requests, onOpenRequest, visible }) {
  if (!visible || !requests || requests.length === 0) return null
  const groups = groupErrors(requests)
  // Note: the same request can appear in multiple groups (different warning messages).
  // So we show a unique failed-request count, and keep "errors" (rows across groups) separate.
  const failHitCount = groups.reduce((acc, g) => acc + g.reqs.length, 0)
  const uniqueFailedScopes = new Set()
  for (const g of groups) {
    for (const r of g.reqs) {
      uniqueFailedScopes.add(r._scope || `${r.InternalFolderID || '—'}|${r._timestamp || '—'}`)
    }
  }
  const uniqueFailCount = uniqueFailedScopes.size
  if (uniqueFailCount === 0) return null

  return (
    <div className="error-panel-section">
      <div className="error-panel-header">
        <span className="error-panel-icon">⚠</span>
        <span className="error-panel-title">
          <strong>{uniqueFailCount}</strong> failed request{uniqueFailCount > 1 ? 's' : ''} detected
        </span>
        {failHitCount !== uniqueFailCount && (
          <span className="error-panel-errors-badge" title="Total errors detected (across error types)">
            {failHitCount} errors
          </span>
        )}
        <span className="error-panel-types-badge">
          {groups.length} error type{groups.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="error-group-list">
        {groups.map((group, i) => (
          <ErrorGroup key={i} group={group} onOpen={onOpenRequest} />
        ))}
      </div>
    </div>
  )
}
