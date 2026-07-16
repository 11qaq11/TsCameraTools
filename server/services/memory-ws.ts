import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { logger } from '../utils/logger.js'
import { MemoryPoller } from './memory-poller.js'

const log = logger.child({ module: 'memory-ws' })

export function setupMemoryWss(server: Server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    if (url.pathname === '/memory') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', (ws) => {
    log.info('Memory WebSocket client connected')

    const poller = new MemoryPoller((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'start':
            poller.start(msg.options)
            break
          case 'stop':
            poller.stop()
            break
          case 'set-show-system-mem':
            poller.setShowSystemMem(msg.value)
            break
        }
      } catch (e) {
        log.warn({ error: (e as Error).message }, 'Invalid memory WS message')
      }
    })

    ws.on('close', () => {
      log.info('Memory WebSocket client disconnected')
      poller.stop()
    })

    ws.on('error', (err) => {
      log.error({ error: err.message }, 'Memory WebSocket error')
      poller.stop()
    })

    ws.send(JSON.stringify({ type: 'ready' }))
  })

  log.info('Memory WebSocket server ready on /memory')
  return wss
}
