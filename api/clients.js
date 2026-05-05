export default function handler(req, res) {
  try {
    const raw = process.env.GATEWAY_CLIENTS
    if (!raw) return res.status(200).json([])
    const clients = JSON.parse(raw)
    res.status(200).json(clients)
  } catch {
    res.status(500).json({ error: 'Invalid clients configuration' })
  }
}
