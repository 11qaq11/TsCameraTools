import { Router } from 'express'
import { checkBinary, startSession, startLocalSession, stopSession, getSessionStatus } from '../services/ttyd.js'
import { logger } from '../utils/logger.js'

const log = logger.child({ module: 'ttyd-api' })

const router = Router()

router.get('/check', (_req, res) => {
  log.debug('GET /api/ttyd/check')
  const result = checkBinary()
  log.debug({ result }, 'GET /api/ttyd/check response')
  res.json(result)
})

router.post('/start', async (req, res) => {
  const { serial } = req.body
  log.debug({ serial }, 'POST /api/ttyd/start')

  if (!serial || typeof serial !== 'string') {
    log.debug('POST /api/ttyd/start: FAILED - serial is required')
    return res.status(400).json({ success: false, error: 'serial is required' })
  }

  try {
    const startTime = Date.now()
    const result = await startSession(serial)
    const elapsed = Date.now() - startTime

    if ('error' in result) {
      log.debug({ error: result.error, elapsed }, 'POST /api/ttyd/start: FAILED')
      return res.status(500).json({ success: false, error: result.error })
    }

    const response = {
      success: true,
      sessionId: result.sessionId,
      port: result.port,
      url: `http://localhost:${result.port}`,
    }
    log.debug({ ...response, elapsed }, 'POST /api/ttyd/start: SUCCESS')
    res.json(response)
  } catch (err) {
    log.error({ error: (err as Error).message, stack: (err as Error).stack }, 'POST /api/ttyd/start: UNHANDLED ERROR')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/start-local', async (_req, res) => {
  log.debug('POST /api/ttyd/start-local')

  try {
    const startTime = Date.now()
    const result = await startLocalSession()
    const elapsed = Date.now() - startTime

    if ('error' in result) {
      log.debug({ error: result.error, elapsed }, 'POST /api/ttyd/start-local: FAILED')
      return res.status(500).json({ success: false, error: result.error })
    }

    const response = {
      success: true,
      sessionId: result.sessionId,
      port: result.port,
      url: `http://localhost:${result.port}`,
    }
    log.debug({ ...response, elapsed }, 'POST /api/ttyd/start-local: SUCCESS')
    res.json(response)
  } catch (err) {
    log.error({ error: (err as Error).message, stack: (err as Error).stack }, 'POST /api/ttyd/start-local: UNHANDLED ERROR')
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/stop', (req, res) => {
  const { sessionId } = req.body
  log.debug({ sessionId }, 'POST /api/ttyd/stop')

  if (!sessionId || typeof sessionId !== 'string') {
    log.debug('POST /api/ttyd/stop: FAILED - sessionId is required')
    return res.status(400).json({ success: false, error: 'sessionId is required' })
  }

  const stopped = stopSession(sessionId)
  if (!stopped) {
    log.debug({ sessionId }, 'POST /api/ttyd/stop: FAILED - session not found')
    return res.status(404).json({ success: false, error: 'session not found' })
  }

  log.debug('POST /api/ttyd/stop: SUCCESS')
  res.json({ success: true })
})

router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params
  log.debug({ sessionId }, 'GET /api/ttyd/status')
  const result = getSessionStatus(sessionId)
  if (!result) {
    log.debug({ sessionId }, 'GET /api/ttyd/status: NOT FOUND')
    return res.status(404).json({ error: 'session not found' })
  }

  log.debug({ sessionId, status: result.status }, 'GET /api/ttyd/status')
  res.json({ sessionId, status: result.status })
})

export default router
