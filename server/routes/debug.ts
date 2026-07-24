import { Router, Request, Response } from 'express'
import pino from 'pino'
import { config } from '../config.js'
import { query } from '../db/index.js'
import crypto from 'crypto'

export interface LogEntry {
  level: number
  time: number
  msg: string
  [key: string]: unknown
}

const MAX_BUFFER_SIZE = 1000
const logBuffer: LogEntry[] = []
const sseClients: Set<Response> = new Set()

// Create a destination that captures logs into buffer
const captureStream = {
  write(chunk: string) {
    try {
      const entry = JSON.parse(chunk) as LogEntry
      logBuffer.push(entry)
      if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.shift()
      }
      // Notify SSE clients
      for (const client of sseClients) {
        client.write(`data: ${JSON.stringify(entry)}\n\n`)
      }
    } catch {
      // Ignore parse errors
    }
  }
}

const level = process.env.LOG_LEVEL || 'info'
export const debugLogger = pino({ level }, captureStream as unknown as NodeJS.WritableStream)

export function getLogs(options?: { level?: number; limit?: number; offset?: number }): LogEntry[] {
  let filtered = [...logBuffer]
  
  if (options?.level !== undefined) {
    filtered = filtered.filter(e => e.level >= options.level!)
  }
  
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? 100
  
  return filtered.slice(offset, offset + limit)
}

const router = Router()

// GET /api/debug/logs - retrieve buffered logs
router.get('/logs', (req: Request, res: Response) => {
  const level = req.query.level ? Number(req.query.level) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const offset = req.query.offset ? Number(req.query.offset) : undefined
  
  const logs = getLogs({ level, limit, offset })
  
  res.json({
    total: logBuffer.length,
    logs
  })
})

// GET /api/debug/logs/stream - SSE endpoint for real-time logs
router.get('/logs/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  
  // Send initial ping
  res.write(':ok\n\n')
  
  sseClients.add(res)
  
  req.on('close', () => {
    sseClients.delete(res)
  })
})

// GET /api/debug/config - system config values
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    port: config.port,
    https: config.https,
    frontendUrl: config.frontendUrl,
    sessionExpiryHours: config.session.expiryHours,
    authDebug: config.authDebug,
    adbPath: config.adb.path,
    ttydPortRange: `${config.ttyd.portStart}-${config.ttyd.portEnd}`,
    databaseUrl: config.database.url.replace(/\/\/.*@/, '//***:***@'),
  })
})

// POST /api/debug/login - debug mode auto-login (only when AUTH_DEBUG=true)
router.post('/login', async (_req: Request, res: Response) => {
  if (!config.authDebug) {
    return res.status(403).json({ error: 'Debug login only available when AUTH_DEBUG=true' })
  }

  try {
    // Ensure debug user exists
    const { rows } = await query(
      `INSERT INTO users (feishu_id, name, email, tenant_key, is_admin)
       VALUES ('debug', '调试用户', 'debug@local', 'debug', true)
       ON CONFLICT (feishu_id) DO UPDATE SET last_login_at = NOW(), is_admin = true
       RETURNING id`,
    )

    const userId = rows[0].id
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionId, userId, expiresAt]
    )

    res.json({
      token: sessionId,
      user: { id: userId, name: '调试用户', email: 'debug@local', feishu_id: 'debug', tenant_key: 'debug', is_admin: true }
    })
  } catch (e) {
    res.status(500).json({ error: 'Debug login failed' })
  }
})

export { router }
export default router
