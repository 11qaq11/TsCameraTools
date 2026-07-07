import { Server, Socket } from 'socket.io'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function logShell(msg: string) {
  const logDir = path.join(__dirname, '..', '..', 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, 'shell.log')
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
}

interface ShellSession {
  id: string
  serial: string
  process: ChildProcess
  userId: string
  alive: boolean
}

const sessions = new Map<string, ShellSession>()

function safeKill(session: ShellSession) {
  if (!session.alive) return
  try {
    session.process.kill()
  } catch {
    // 进程可能已经退出
  }
  session.alive = false
}

export function setupShellSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)
    let currentSession: ShellSession | null = null

    socket.on('shell:start', (data: { serial: string; userId: string }) => {
      if (currentSession) {
        safeKill(currentSession)
        sessions.delete(currentSession.id)
        currentSession = null
      }

      const { serial, userId } = data
      const sessionId = uuidv4()
      const adbPath = config.adb.path

      logShell(`[START] Session ${sessionId} for device ${serial}`)

      try {
        const shellProcess = spawn(adbPath, ['-s', serial, 'shell'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, LANG: 'en_US.UTF-8' }
        })

        const session: ShellSession = {
          id: sessionId,
          serial,
          process: shellProcess,
          userId,
          alive: true
        }

        sessions.set(sessionId, session)
        currentSession = session

        socket.emit('shell:started', { sessionId, serial })
        logShell(`[STARTED] Session ${sessionId}`)

        // 处理 stdout
        shellProcess.stdout?.on('data', (data: Buffer) => {
          if (session.alive) {
            socket.emit('shell:output', { sessionId, data: data.toString() })
          }
        })

        // 处理 stderr
        shellProcess.stderr?.on('data', (data: Buffer) => {
          if (session.alive) {
            socket.emit('shell:output', { sessionId, data: data.toString() })
          }
        })

        // 处理退出
        shellProcess.on('exit', (code: number | null, signal: string | null) => {
          logShell(`[EXIT] Session ${sessionId} code=${code} signal=${signal}`)
          session.alive = false
          socket.emit('shell:exit', { sessionId, code })
          sessions.delete(sessionId)
          if (currentSession?.id === sessionId) {
            currentSession = null
          }
        })

        shellProcess.on('error', (err: Error) => {
          logShell(`[ERROR] Session ${sessionId}: ${err.message}`)
          session.alive = false
          socket.emit('shell:error', { sessionId, error: err.message })
          sessions.delete(sessionId)
          if (currentSession?.id === sessionId) {
            currentSession = null
          }
        })
      } catch (err) {
        logShell(`[ERROR] Failed to start: ${err}`)
        socket.emit('shell:error', { sessionId, error: String(err) })
      }
    })

    socket.on('shell:input', (data: { sessionId: string; input: string }) => {
      const session = sessions.get(data.sessionId)
      if (session && session.alive && session.process.stdin) {
        try {
          session.process.stdin.write(data.input)
        } catch (err) {
          logShell(`[ERROR] Write failed: ${err}`)
        }
      }
    })

    socket.on('shell:resize', (data: { sessionId: string; cols: number; rows: number }) => {
      // child_process 不支持 resize，但不影响功能
    })

    socket.on('shell:kill', (data: { sessionId: string }) => {
      const session = sessions.get(data.sessionId)
      if (session) {
        logShell(`[KILL] Session ${data.sessionId}`)
        safeKill(session)
        sessions.delete(data.sessionId)
        if (currentSession?.id === data.sessionId) {
          currentSession = null
        }
      }
    })

    socket.on('disconnect', () => {
      logShell(`[DISCONNECT] Client ${socket.id}`)
      if (currentSession) {
        safeKill(currentSession)
        sessions.delete(currentSession.id)
        currentSession = null
      }
    })
  })
}
