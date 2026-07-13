import { Router, Request, Response } from 'express'
import pino from 'pino'

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

export { router }
export default router
