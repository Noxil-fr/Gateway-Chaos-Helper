import { useRef, useState } from 'react'
import { normalizeErrorMessage } from '../utils/repairOrderErrors'

export default function FileUploader({ onParsed }) {
  const inputRef = useRef()
  const [filename, setFilename] = useState(null)
  const [stats, setStats] = useState(null)
  const [readError, setReadError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const extractTimestamp = (line) => {
    const match = line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/)
    if (!match) return null
    return match[1].replace(/\//g, '-').replace(' ', 'T')
  }

  const extractScope = (line) => {
    const match = line.match(/scope:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)
    return match ? match[1] : null
  }

  const extractLevel = (line) => {
    const match = line.match(/\|(INFO|WARN|ERROR|DEBUG)\|/)
    return match ? match[1] : 'INFO'
  }

  const extractMessage = (line) => {
    // Message = tout ce qui est après le 4ème | et avant le dernier |
    const parts = line.split('|')
    if (parts.length < 5) return line
    // First line of a multi-line entry: no closing " |Source|" yet, keep everything
    if (!line.trimEnd().endsWith('|')) return parts.slice(4).join('|').trim()
    return parts.slice(4, parts.length - 1).join('|').trim()
  }

  // Line layout: timestamp|LEVEL|companyID|scope|correlation_id|message |Source|
  // A multi-line entry (exception text) only gets its " |Source|" on its last line: the issue stays open until then
  const extractIssue = (line, ts, level, scope) => {
    const parts = line.trimEnd().split('|')
    const closed = parts.length >= 7 && line.trimEnd().endsWith('|')
    return {
      timestamp: ts, level, scope,
      source: closed ? parts[parts.length - 2].trim() : '',
      message: (closed ? parts.slice(5, parts.length - 2) : parts.slice(5)).join('|').trim(),
      _open: !closed,
    }
  }

  const appendIssueLine = (issue, line) => {
    const text = line.trimEnd()
    const parts = text.split('|')
    const closed = parts.length >= 3 && text.endsWith('|')
    const tail = (closed ? parts.slice(0, parts.length - 2) : parts).join('|').trim()
    if (tail) issue.message = `${issue.message} ${tail}`
    if (closed) {
      issue.source = parts[parts.length - 2].trim()
      issue._open = false
    }
  }

  const extractJson = (line, marker) => {
    const idx = line.indexOf(marker)
    if (idx === -1) return null

    const objStart = line.indexOf('{', idx)
    const arrStart = line.indexOf('[', idx)
    const jsonStart = (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) ? arrStart : objStart
    if (jsonStart === -1) return null

    const jsonEnd = line[jsonStart] === '[' ? line.lastIndexOf(']') : line.lastIndexOf('}')
    if (jsonEnd === -1 || jsonEnd < jsonStart) return null
    try {
      return JSON.parse(line.slice(jsonStart, jsonEnd + 1))
    } catch {
      return null
    }
  }

  const parseLog = (text) => {
    const lines = text.split('\n')
    let firstTimestamp = null
    let lastTimestamp = null

    // Pass 1: collect all lines per scope + extract requests
    const requests = []
    const scopeLines = {} // scope -> [{ timestamp, level, message, raw }]
    let logIssues = [] // every ERROR line, whatever the request type, + SetRepairOrder response warnings
    let openIssue = null

    for (const line of lines) {
      if (!line.trim()) continue

      const ts = extractTimestamp(line)
      if (openIssue) {
        if (ts) openIssue._open = false
        else appendIssueLine(openIssue, line)
        if (!openIssue._open) openIssue = null
      }
      if (ts) {
        if (!firstTimestamp) firstTimestamp = ts
        lastTimestamp = ts
      }

      const scope = extractScope(line)
      const level = extractLevel(line)
      if (scope) {
        if (!scopeLines[scope]) scopeLines[scope] = []
        scopeLines[scope].push({
          timestamp: ts,
          level,
          message: extractMessage(line),
        })
      }
      // Raw WARN lines are internal noise (e.g. "Failed to get the list of Jobs"): warnings come from the responses below
      if (ts && level === 'ERROR') {
        const issue = extractIssue(line, ts, level, scope)
        logIssues.push(issue)
        if (issue._open) openIssue = issue
      }

      if (line.includes('Call SetRepairOrder Params')) {
        const obj = extractJson(line, 'Call SetRepairOrder Params')
        if (!obj) continue
        obj._timestamp = ts
        obj._scope = scope
        obj._queryType = 'SetRepairOrder'
        requests.push(obj)
        continue
      }

      if (line.includes('Call SetWorkShopAppointmentV2 Params')) {
        const payload = extractJson(line, 'Call SetWorkShopAppointmentV2 Params')
        if (!payload) continue
        const items = Array.isArray(payload) ? payload : [payload]
        for (const item of items) {
          if (!item || typeof item !== 'object') continue
          item._timestamp = ts
          item._scope = scope
          item._queryType = 'SetWorkShopAppointmentV2'
          requests.push(item)
        }
      }

      if (line.includes('Call SetClients Params')) {
        const payload = extractJson(line, 'Call SetClients Params')
        if (!payload) continue
        const items = Array.isArray(payload) ? payload : [payload]
        for (const item of items) {
          if (!item || typeof item !== 'object') continue
          item._timestamp = ts
          item._scope = scope
          item._queryType = 'SetClients'
          requests.push(item)
        }
      }

      if (line.includes('Call SetEvents Params')) {
        const obj = extractJson(line, 'Call SetEvents Params')
        if (!obj) continue
        obj._timestamp = ts
        obj._scope = scope
        obj._queryType = 'SetEvents'
        requests.push(obj)
      }

      // Params is a plain string, not a JSON object: Call GetRepairOrder Params "004|558648"
      if (line.includes('Call GetRepairOrder Params')) {
        const match = line.match(/Call GetRepairOrder Params\s+"([^"]*)"/)
        if (!match) continue
        requests.push({ InternalFolderID: match[1], _timestamp: ts, _scope: scope, _queryType: 'GetRepairOrder' })
      }
    }

    // Pass 2: match responses by scope
    const responseMap = {}
    for (const line of lines) {
      if (!line.includes('RepairOrder.SetRepairOrder Response :')) continue
      const scope = extractScope(line)
      if (!scope) continue
      const obj = extractJson(line, 'RepairOrder.SetRepairOrder Response :')
      if (obj) responseMap[scope] = obj
    }

    // Link each request to its response and scope logs
    for (const req of requests) {
      if (req._scope) {
        if (responseMap[req._scope]) req._response = responseMap[req._scope]
        if (scopeLines[req._scope]) req._scopeLogs = scopeLines[req._scope]
      }
      // GetRepairOrder logs no response of its own: its last "Result {...}" line is the outcome
      if (req._queryType === 'GetRepairOrder' && req._scopeLogs) {
        const resultLog = req._scopeLogs.findLast(l => l.message.includes('Result {'))
        const obj = resultLog && extractJson(resultLog.message, 'Result {')
        if (obj) req._response = obj
      }
    }

    // Keep only the ERROR lines of a parsed request (a GetRepairOrder error, for instance, is not one of ours).
    // Those of a failed SetRepairOrder are its real cause behind "Operation failed": they go to the FAIL panel instead
    const requestByScope = {}
    for (const req of requests) if (req._scope && !requestByScope[req._scope]) requestByScope[req._scope] = req
    const requestErrors = []
    for (const issue of logIssues) {
      const req = issue.scope && requestByScope[issue.scope]
      if (!req) continue
      if (req._queryType === 'SetRepairOrder' && req._response?.Status === 'FAIL') {
        if (!req._logErrors) req._logErrors = []
        req._logErrors.push(issue.message)
        continue
      }
      issue._request = req
      requestErrors.push(issue)
    }
    logIssues = requestErrors

    // Non-blocking warnings of SetRepairOrder responses (blocking ones already feed the FAIL error panel)
    for (const req of requests) {
      if (req._queryType !== 'SetRepairOrder' || !req._response) continue
      const seen = new Set()
      for (const w of req._response.Warnings || []) {
        if (w.Severity > 0) continue
        const text = (w.ErrorMessage || '').trim() || 'Unknown warning'
        const message = w.ErrorID ? `[${w.ErrorID}] ${text}` : text
        if (seen.has(message)) continue
        seen.add(message)
        // Mask only the text: the ErrorID prefix must stay readable ("[200015] … (Reference=…)")
        const groupMessage = w.ErrorID ? `[${w.ErrorID}] ${normalizeErrorMessage(text)}` : normalizeErrorMessage(text)
        logIssues.push({
          timestamp: req._timestamp, level: 'WARN', scope: req._scope, source: 'SetRepairOrder',
          message, groupMessage, _request: req,
        })
      }
    }

    return { results: requests, firstTimestamp, lastTimestamp, logIssues }
  }

  const handleFile = (file) => {
    if (!file) return
    setFilename(file.name)
    setStats(null)
    setReadError(null)
    const sizeMB = Math.round(file.size / 1e6)
    const reader = new FileReader()
    reader.onload = (e) => {
      let parsed
      try {
        parsed = parseLog(e.target.result)
      } catch (err) {
        // Very large files can exceed the browser's memory or string limits
        setReadError(`Could not analyze this file (${sizeMB} MB): ${err.message}`)
        return
      }
      const { results, firstTimestamp, lastTimestamp, logIssues } = parsed
      const typeCounts = {}
      for (const r of results) {
        const qt = r._queryType || 'unknown'
        typeCounts[qt] = (typeCounts[qt] || 0) + 1
      }
      setStats({ total: results.length, typeCounts })
      onParsed(results, firstTimestamp, lastTimestamp, logIssues)
    }
    reader.onerror = () => {
      setReadError(`Could not read this file (${sizeMB} MB)${reader.error ? `: ${reader.error.message}` : ''}`)
    }
    reader.readAsText(file)
  }

  const onInputChange = (e) => handleFile(e.target.files[0])
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'active' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input ref={inputRef} type="file" accept=".log,.txt" onChange={onInputChange} />
      <div>📂 Drop your <strong>.log</strong> DMS Gateway file here, or click to browse</div>
      {filename && <div className="filename">{readError ? '❌' : '✅'} {filename}</div>}
      {readError && <div className="inline-error">{readError}</div>}
      {stats !== null && (
        <div className="stats">
          <span>{stats.total} request{stats.total > 1 ? 's' : ''} found</span>
          <div className="stats-breakdown">
            {Object.entries(stats.typeCounts).map(([type, count]) => (
              <span key={type} className="stats-type">{type} <strong>{count}</strong></span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
