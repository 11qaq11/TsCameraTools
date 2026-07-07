import { Router } from 'express'
import { checkBinary, startSession, stopSession, getSessionStatus } from '../services/ttyd.js'

const router = Router()

router.get('/check', (_req, res) => {
  const result = checkBinary()
  res.json(result)
})

router.post('/start', async (req, res) => {
  const { serial } = req.body
  if (!serial || typeof serial !== 'string') {
    return res.status(400).json({ success: false, error: 'serial is required' })
  }

  const result = await startSession(serial)
  if ('error' in result) {
    return res.status(500).json({ success: false, error: result.error })
  }

  res.json({
    success: true,
    sessionId: result.sessionId,
    port: result.port,
    url: `http://localhost:${result.port}`,
  })
})

router.post('/stop', (req, res) => {
  const { sessionId } = req.body
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ success: false, error: 'sessionId is required' })
  }

  const stopped = stopSession(sessionId)
  if (!stopped) {
    return res.status(404).json({ success: false, error: 'session not found' })
  }

  res.json({ success: true })
})

router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const result = getSessionStatus(sessionId)
  if (!result) {
    return res.status(404).json({ error: 'session not found' })
  }

  res.json({ sessionId, status: result.status })
})

export default router
