export async function fetchSubscriberData(subscriber) {
  const response = await fetch(`/api/gateway?subscriber=${encodeURIComponent(subscriber)}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `HTTP error: ${response.status}`)
  return data
}

export async function fetchClients() {
  const response = await fetch('/api/clients')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `HTTP error: ${response.status}`)
  return data
}
