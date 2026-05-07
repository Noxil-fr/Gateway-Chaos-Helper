import { useRef, useState } from 'react'

export default function FileUploader({ onParsed }) {
  const inputRef = useRef()
  const [filename, setFilename] = useState(null)
  const [stats, setStats] = useState(null)
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
    return parts.slice(4, parts.length - 1).join('|').trim()
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

    for (const line of lines) {
      if (!line.trim()) continue

      const ts = extractTimestamp(line)
      if (ts) {
        if (!firstTimestamp) firstTimestamp = ts
        lastTimestamp = ts
      }

      const scope = extractScope(line)
      if (scope) {
        if (!scopeLines[scope]) scopeLines[scope] = []
        scopeLines[scope].push({
          timestamp: ts,
          level: extractLevel(line),
          message: extractMessage(line),
          raw: line,
        })
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
    }

    return { results: requests, firstTimestamp, lastTimestamp }
  }

  const handleFile = (file) => {
    if (!file) return
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { results, firstTimestamp, lastTimestamp } = parseLog(e.target.result)
      const typeCounts = {}
      for (const r of results) {
        const qt = r._queryType || 'unknown'
        typeCounts[qt] = (typeCounts[qt] || 0) + 1
      }
      setStats({ total: results.length, typeCounts })
      onParsed(results, firstTimestamp, lastTimestamp)
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
      {filename && <div className="filename">✅ {filename}</div>}
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
