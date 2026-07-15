import { spawn, type IPty } from 'node-pty'
import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { logger } from '../utils/logger.js'

const log = logger.child({ module: 'terminal' })

interface TerminalSession {
  id: string
  pty: IPty
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
    } else {
      socket.destroy()
    }
  })

  wss.on('connection', (ws, request) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    const type = (url.searchParams.get('type') || 'local') as 'adb' | 'local'
    const serial = url.searchParams.get('serial') || undefined
    const sessionId = `${type}-${serial || 'local'}-${Date.now()}`

    log.info({ sessionId, type, serial }, 'WebSocket connection')

    let pty: IPty
    try {
      if (type === 'adb' && serial) {
        pty = spawn('adb', ['-s', serial, 'shell'], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          env: { ...process.env, LANG: 'en_US.UTF-8' } as Record<string, string>,
        })
      } else {
        const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash'
        pty = spawn(shell, [], {
          name: 'xterm-256color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME || process.env.USERPROFILE || '.',
          env: { ...process.env, LANG: 'en_US.UTF-8' } as Record<string, string>,
        })
      }
    } catch (err) {
      log.error({ error: (err as Error).message, type, serial }, 'Failed to spawn PTY')
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
      ws.send(JSON.stringify({ type: 'exit', exitCode, signal }))
      ws.close(1000, 'Terminal exited')
      sessions.delete(sessionId)
    })

    // WebSocket input → PTY
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'input':
            pty.write(msg.data)
            break
          case 'resize':
            if (msg.cols && msg.rows) {
              pty.resize(msg.cols, msg.rows)
            }
            break
          case 'kill':
            pty.kill()
            break
        }
      } catch {
        // Binary data - write directly
        pty.write(raw.toString())
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
