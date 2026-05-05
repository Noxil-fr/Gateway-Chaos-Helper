export default async function handler(req, res) {
  const { subscriber, client } = req.query

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return res.status(500).json({ error: 'Webhook URL not configured' })

  let resolvedSubscriber = subscriber

  if (client) {
    try {
      const raw = process.env.GATEWAY_CLIENTS
      if (!raw) return res.status(400).json({ error: 'No clients configured' })
      const clients = JSON.parse(raw)
      const found = clients.find(c => c.name === client)
      if (!found) return res.status(404).json({ error: `Client "${client}" not found` })
      resolvedSubscriber = found.subscriber
    } catch {
      return res.status(500).json({ error: 'Invalid clients configuration' })
    }
  }

  if (!resolvedSubscriber) return res.status(400).json({ error: 'Missing subscriber or client' })

  try {
    const response = await fetch(`${webhookUrl}/${encodeURIComponent(resolvedSubscriber)}`)
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`)
    const data = await response.json()
    res.status(200).json({
      version: data?.Version || 'N/A',
      dms: data?.DMS || 'N/A',
      provider: data?.PROVIDER || 'N/A',
    })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
