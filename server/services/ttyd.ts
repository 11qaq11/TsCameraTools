import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface TtydSession {
  id: string
  serial: string
  port: number
  pid: number
  process: ChildProcess
  status: 'starting' | 'running' | 'stopped'
}

const sessions = new Map<string, TtydSession>()

function getTtydPath(): string {
  return path.join(__dirname, '..', '..', 'bin', 'ttyd', 'ttyd.exe')
}

function getPortStart(): number {
  return parseInt(process.env.TTYD_PORT_START || '7681')
}

function getPortEnd(): number {
  return parseInt(process.env.TTYD_PORT_END || '7690')
}

function getCredential(): string {
  return process.env.TTYD_CREDENTIAL || 'admin:admin'
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
    server.on('error', () => resolve(false))
  })
}

async function findAvailablePort(): Promise<number | null> {
  const start = getPortStart()
  const end = getPortEnd()
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) {
      return port
    }
  }
  return null
}

function waitForReady(port: number, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const check = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`)
        if (res.ok) {
          resolve(true)
          return
        }
      } catch {
        // not ready yet
      }
      if (Date.now() - startTime > timeoutMs) {
        resolve(false)
        return
      }
      setTimeout(check, 100)
    }
    check()
  })
}

export function checkBinary(): { available: boolean; version: string; path: string } {
  const ttydPath = getTtydPath()
  const available = fs.existsSync(ttydPath)
  return {
    available,
    version: '1.7.7',
    path: ttydPath,
  }
}

export async function startSession(serial: string): Promise<{ sessionId: string; port: number } | { error: string }> {
  const binary = checkBinary()
  if (!binary.available) {
    return { error: 'ttyd binary not found' }
  }

  const port = await findAvailablePort()
  if (port === null) {
    return { error: 'No available port' }
  }

  const sessionId = uuidv4()
  const credential = getCredential()

  const themeJson = JSON.stringify({
    background: '#FFFFFF',
    foreground: '#0F172A',
    cursor: '#2563EB',
    cursorAccent: '#FFFFFF',
    selectionBackground: 'rgba(37, 99, 235, 0.2)',
    black: '#0F172A',
    red: '#DC2626',
    green: '#16A34A',
    yellow: '#CA8A04',
    blue: '#2563EB',
    magenta: '#9333EA',
    cyan: '#0891B2',
    white: '#F8FAFC',
    brightBlack: '#64748B',
    brightRed: '#EF4444',
    brightGreen: '#22C55E',
    brightYellow: '#EAB308',
    brightBlue: '#3B82F6',
    brightMagenta: '#A855F7',
    brightCyan: '#06B6D4',
    brightWhite: '#FFFFFF',
  })

  const args = [
    '-p', String(port),
    '-c', credential,
    '-t', `fontSize=14`,
    '-t', `theme=${themeJson}`,
    'adb', '-s', serial, 'shell',
  ]

  try {
    const child = spawn(binary.path, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'en_US.UTF-8' },
    })

    const session: TtydSession = {
      id: sessionId,
      serial,
      port,
      pid: child.pid || 0,
      process: child,
      status: 'starting',
    }

    sessions.set(sessionId, session)

    child.on('error', (err) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      console.error(`[Ttyd] Session ${sessionId} error: ${err.message}`)
    })

    child.on('exit', (code) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      console.log(`[Ttyd] Session ${sessionId} exited with code ${code}`)
    })

    const ready = await waitForReady(port)
    if (!ready) {
      child.kill()
      sessions.delete(sessionId)
      return { error: 'Failed to start ttyd' }
    }

    session.status = 'running'
    console.log(`[Ttyd] Session ${sessionId} started on port ${port}`)
    return { sessionId, port }
  } catch (err) {
    sessions.delete(sessionId)
    return { error: `Failed to start ttyd: ${err}` }
  }
}

export function stopSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (!session) return false

  try {
    session.process.kill()
  } catch {
    // process may already be dead
  }
  session.status = 'stopped'
  sessions.delete(sessionId)
  console.log(`[Ttyd] Session ${sessionId} stopped`)
  return true
}

export function getSessionStatus(sessionId: string): { status: string } | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  return { status: session.status }
}
