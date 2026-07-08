import { Router } from 'express'
import { checkBinary, startSession, startLocalSession, stopSession, getSessionStatus } from '../services/ttyd.js'
import { debugLog } from '../utils/debug-logger.js'

const router = Router()

router.get('/check', (_req, res) => {
  debugLog('API', 'GET /api/ttyd/check')
  const result = checkBinary()
  debugLog('API', 'GET /api/ttyd/check response', result)
  res.json(result)
})

router.post('/start', async (req, res) => {
  const { serial } = req.body
  debugLog('API', 'POST /api/ttyd/start', { serial })

  if (!serial || typeof serial !== 'string') {
    debugLog('API', 'POST /api/ttyd/start: FAILED - serial is required')
    return res.status(400).json({ success: false, error: 'serial is required' })
  }

  const startTime = Date.now()
  const result = await startSession(serial)
  const elapsed = Date.now() - startTime

  if ('error' in result) {
    debugLog('API', `POST /api/ttyd/start: FAILED after ${elapsed}ms`, { error: result.error })
    return res.status(500).json({ success: false, error: result.error })
  }

  const response = {
    success: true,
    sessionId: result.sessionId,
    port: result.port,
    url: `http://localhost:${result.port}`,
  }
  debugLog('API', `POST /api/ttyd/start: SUCCESS after ${elapsed}ms`, response)
  res.json(response)
})

router.post('/start-local', async (_req, res) => {
  debugLog('API', 'POST /api/ttyd/start-local')

  const startTime = Date.now()
  const result = await startLocalSession()
  const elapsed = Date.now() - startTime

  if ('error' in result) {
    debugLog('API', `POST /api/ttyd/start-local: FAILED after ${elapsed}ms`, { error: result.error })
    return res.status(500).json({ success: false, error: result.error })
  }

  const response = {
    success: true,
    sessionId: result.sessionId,
    port: result.port,
    url: `http://localhost:${result.port}`,
  }
  debugLog('API', `POST /api/ttyd/start-local: SUCCESS after ${elapsed}ms`, response)
  res.json(response)
})

router.post('/stop', (req, res) => {
  const { sessionId } = req.body
  debugLog('API', 'POST /api/ttyd/stop', { sessionId })

  if (!sessionId || typeof sessionId !== 'string') {
    debugLog('API', 'POST /api/ttyd/stop: FAILED - sessionId is required')
    return res.status(400).json({ success: false, error: 'sessionId is required' })
  }

  const stopped = stopSession(sessionId)
  if (!stopped) {
    debugLog('API', 'POST /api/ttyd/stop: FAILED - session not found')
    return res.status(404).json({ success: false, error: 'session not found' })
  }

  debugLog('API', 'POST /api/ttyd/stop: SUCCESS')
  res.json({ success: true })
})

router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params
  debugLog('API', `GET /api/ttyd/status/${sessionId}`)
  const result = getSessionStatus(sessionId)
  if (!result) {
    debugLog('API', `GET /api/ttyd/status/${sessionId}: NOT FOUND`)
    return res.status(404).json({ error: 'session not found' })
  }

  debugLog('API', `GET /api/ttyd/status/${sessionId}: status=${result.status}`)
  res.json({ sessionId, status: result.status })
})

export default router
