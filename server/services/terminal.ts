import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'

// Lazy load node-pty to handle ConPTY initialization errors gracefully
let nodePty: typeof import('node-pty') | null = null
let ptyLoadError: string | null = null

async function loadNodePty() {
  if (nodePty || ptyLoadError) return
  try {
    nodePty = await import('node-pty')
    logger.info('node-pty loaded successfully')
  } catch (err) {
    ptyLoadError = (err as Error).message
    logger.error({ error: ptyLoadError }, 'Failed to load node-pty')
  }
}

const log = logger.child({ module: 'terminal' })

interface TerminalSession {
  id: string
  pty: import('node-pty').IPty
  ws: WebSocket
  serial?: string
  type: 'adb' | 'local'
}

const sessions = new Map<string, TerminalSession>()

export function setupTerminalWss(server: Server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    if (url.pathname === '/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
    // Don't destroy socket here - let Socket.io handle its own upgrades
  })

  wss.on('connection', async (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const type = (url.searchParams.get('type') || 'local') as 'adb' | 'local'
    const serial = url.searchParams.get('serial') || undefined
    const sessionId = `${type}-${serial || 'local'}-${Date.now()}`

    log.info({ sessionId, type, serial }, 'WebSocket connection')

    // Ensure node-pty is loaded
    await loadNodePty()

    if (!nodePty) {
      const errMsg = ptyLoadError || 'node-pty not available'
      log.error({ sessionId, error: errMsg }, 'Cannot spawn PTY')
      ws.send(JSON.stringify({ type: 'error', message: `Terminal unavailable: ${errMsg}` }))
      ws.close(1011, 'Terminal module failed to load')
      return
    }

    let pty: import('node-pty').IPty
    try {
      if (type === 'adb' && serial) {
        const adbPath = config.adb.path
        log.info({ sessionId, adbPath, serial }, 'Spawning ADB shell')
        pty = nodePty.spawn(adbPath, ['-s', serial, 'shell'], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          env: { ...process.env, LANG: 'en_US.UTF-8' } as Record<string, string>,
        })
      } else {
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
        const cwd = process.env.USERPROFILE || process.env.HOME || '.'
        log.info({ sessionId, shell, cwd }, 'Spawning local shell')
        pty = nodePty.spawn(shell, ['-NoLogo'], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd,
          env: { ...process.env, LANG: 'en_US.UTF-8' } as Record<string, string>,
        })
      }
    } catch (err) {
      log.error({ error: (err as Error).message, type, serial }, 'Failed to spawn PTY')
      ws.send(JSON.stringify({ type: 'error', message: `Failed to spawn terminal: ${(err as Error).message}` }))
      ws.close(1011, 'Failed to spawn terminal')
      return
    }

    const session: TerminalSession = { id: sessionId, pty, ws, serial, type }
    sessions.set(sessionId, session)

    log.info({ sessionId, pid: pty.pid, type, serial }, 'PTY spawned')

    // PTY output → WebSocket
    pty.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }))
      }
    })

    pty.onExit(({ exitCode, signal }) => {
      log.info({ sessionId, exitCode, signal }, 'PTY exited')
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', exitCode, signal }))
        ws.close(1000, 'Terminal exited')
      }
      sessions.delete(sessionId)
    })

    // WebSocket input → PTY
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'input':
            try { pty.write(msg.data) } catch (e) {
              log.warn({ sessionId, error: (e as Error).message }, 'PTY write failed')
            }
            break
          case 'resize':
            if (msg.cols && msg.rows) {
              try { pty.resize(msg.cols, msg.rows) } catch (e) {
                log.warn({ sessionId, error: (e as Error).message }, 'PTY resize failed')
              }
            }
            break
          case 'kill':
            try { pty.kill() } catch {}
            break
        }
      } catch {
        // Binary data - write directly
        try { pty.write(raw.toString()) } catch {}
      }
    })

    ws.on('close', () => {
      log.info({ sessionId }, 'WebSocket closed')
      try { pty.kill() } catch {}
      sessions.delete(sessionId)
    })

    ws.on('error', (err) => {
      log.error({ sessionId, error: err.message }, 'WebSocket error')
      try { pty.kill() } catch {}
      sessions.delete(sessionId)
    })

    // Send session info
    ws.send(JSON.stringify({ type: 'ready', sessionId, pid: pty.pid }))
  })

  log.info('Terminal WebSocket server ready on /terminal')
  return wss
}
