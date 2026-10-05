// Vercel can answer with an HTML page (timeout, crash), so the body is not guaranteed to be JSON
async function getJson(url) {
  const response = await fetch(url)
  let data = null
  try {
    data = await response.json()
  } catch {
    if (response.ok) throw new Error('Invalid response from server')
  }
  if (!response.ok) throw new Error(data?.error || `Server error (HTTP ${response.status})`)
  return data
}

export function fetchSubscriberData(subscriber) {
  return getJson(`/api/gateway?subscriber=${encodeURIComponent(subscriber)}`)
}

export function fetchClientData(clientName) {
  return getJson(`/api/gateway?client=${encodeURIComponent(clientName)}`)
}

export function fetchClients() {
  return getJson('/api/clients')
}
