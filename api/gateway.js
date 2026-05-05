export default async function handler(req, res) {
  const { subscriber } = req.query
  if (!subscriber) return res.status(400).json({ error: 'Missing subscriber' })

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return res.status(500).json({ error: 'Webhook URL not configured' })

  try {
    const response = await fetch(`${webhookUrl}/${encodeURIComponent(subscriber)}`)
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
