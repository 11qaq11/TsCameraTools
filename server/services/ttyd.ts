import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { debugLog } from '../utils/debug-logger.js'

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
  debugLog('Ttyd', `findAvailablePort: scanning range ${start}-${end}`)
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port)
    debugLog('Ttyd', `  port ${port}: ${available ? 'available' : 'in use'}`)
    if (available) {
      debugLog('Ttyd', `findAvailablePort: selected port ${port}`)
      return port
    }
  }
  debugLog('Ttyd', 'findAvailablePort: no available port')
  return null
}

function waitForReady(port: number, timeoutMs = 5000): Promise<boolean> {
  debugLog('Ttyd', `waitForReady: checking port ${port}, timeout=${timeoutMs}ms`)
  return new Promise((resolve) => {
    const startTime = Date.now()
    let attempts = 0
    const check = async () => {
      attempts++
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`)
        debugLog('Ttyd', `waitForReady: attempt ${attempts}, status=${res.status}, elapsed=${Date.now() - startTime}ms`)
        if (res.ok) {
          debugLog('Ttyd', `waitForReady: ready after ${attempts} attempts, ${Date.now() - startTime}ms`)
          resolve(true)
          return
        }
      } catch (err) {
        debugLog('Ttyd', `waitForReady: attempt ${attempts}, not ready yet, elapsed=${Date.now() - startTime}ms`, { error: String(err) })
      }
      if (Date.now() - startTime > timeoutMs) {
        debugLog('Ttyd', `waitForReady: TIMEOUT after ${attempts} attempts, ${Date.now() - startTime}ms`)
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
  debugLog('Ttyd', `checkBinary: path=${ttydPath}, available=${available}`)
  return {
    available,
    version: '1.7.7',
    path: ttydPath,
  }
}

export async function startSession(serial: string): Promise<{ sessionId: string; port: number } | { error: string }> {
  debugLog('Ttyd', `startSession: serial=${serial}`)

  const binary = checkBinary()
  if (!binary.available) {
    debugLog('Ttyd', 'startSession: FAILED - ttyd binary not found')
    return { error: 'ttyd binary not found' }
  }

  const port = await findAvailablePort()
  if (port === null) {
    debugLog('Ttyd', 'startSession: FAILED - no available port')
    return { error: 'No available port' }
  }

  const sessionId = uuidv4()
  const credential = getCredential()

  const themeJson = JSON.stringify({
    background: '#F1F5F9',
    foreground: '#0F172A',
    cursor: '#2563EB',
    cursorAccent: '#FFFFFF',
    selectionBackground: '#DBEAFE',
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

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  const args = [
    '-p', String(port),
    '-i', '127.0.0.1',
    '--writable',
    '-t', `fontSize=14`,
    '-t', `theme=${themeJson}`,
    '-t', `corsCredential=true`,
    '-t', `origin=${frontendUrl}`,
    '-t', 'disableResizeOverlay=true',
    'adb', '-s', serial, 'shell',
  ]

  debugLog('Ttyd', `startSession: spawning ttyd`, {
    sessionId,
    port,
    serial,
    binaryPath: binary.path,
    args: args.join(' '),
    frontendUrl,
  })

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

    debugLog('Ttyd', `startSession: process spawned, pid=${child.pid}`)

    child.stdout?.on('data', (data) => {
      debugLog('Ttyd', `[stdout] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      debugLog('Ttyd', `[stderr] ${data.toString().trim()}`)
    })

    child.on('error', (err) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      debugLog('Ttyd', `startSession: process ERROR`, {
        sessionId,
        pid: child.pid,
        error: err.message,
        stack: err.stack,
      })
      console.error(`[Ttyd] Session ${sessionId} error: ${err.message}`)
    })

    child.on('exit', (code, signal) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      debugLog('Ttyd', `startSession: process EXIT`, {
        sessionId,
        pid: child.pid,
        exitCode: code,
        signal,
      })
      console.log(`[Ttyd] Session ${sessionId} exited with code ${code}`)
    })

    const ready = await waitForReady(port)
    if (!ready) {
      debugLog('Ttyd', `startSession: FAILED - ttyd not ready within timeout, killing process`)
      child.kill()
      sessions.delete(sessionId)
      return { error: 'Failed to start ttyd' }
    }

    session.status = 'running'
    debugLog('Ttyd', `startSession: SUCCESS`, { sessionId, port, pid: child.pid })
    console.log(`[Ttyd] Session ${sessionId} started on port ${port}`)
    return { sessionId, port }
  } catch (err) {
    sessions.delete(sessionId)
    debugLog('Ttyd', `startSession: EXCEPTION`, { sessionId, error: String(err) })
    return { error: `Failed to start ttyd: ${err}` }
  }
}

export function stopSession(sessionId: string): boolean {
  debugLog('Ttyd', `stopSession: sessionId=${sessionId}`)
  const session = sessions.get(sessionId)
  if (!session) {
    debugLog('Ttyd', `stopSession: session not found`)
    return false
  }

  try {
    session.process.kill()
    debugLog('Ttyd', `stopSession: process killed, pid=${session.process.pid}`)
  } catch (err) {
    debugLog('Ttyd', `stopSession: kill failed (process may already be dead)`, { error: String(err) })
  }
  session.status = 'stopped'
  sessions.delete(sessionId)
  console.log(`[Ttyd] Session ${sessionId} stopped`)
  return true
}

export function getSessionStatus(sessionId: string): { status: string } | null {
  debugLog('Ttyd', `getSessionStatus: sessionId=${sessionId}`)
  const session = sessions.get(sessionId)
  if (!session) {
    debugLog('Ttyd', `getSessionStatus: session not found`)
    return null
  }
  debugLog('Ttyd', `getSessionStatus: status=${session.status}`)
  return { status: session.status }
}

export async function startLocalSession(): Promise<{ sessionId: string; port: number } | { error: string }> {
  debugLog('Ttyd', 'startLocalSession: starting local shell')

  const binary = checkBinary()
  if (!binary.available) {
    debugLog('Ttyd', 'startLocalSession: FAILED - ttyd binary not found')
    return { error: 'ttyd binary not found' }
  }

  const port = await findAvailablePort()
  if (port === null) {
    debugLog('Ttyd', 'startLocalSession: FAILED - no available port')
    return { error: 'No available port' }
  }

  const sessionId = uuidv4()
  const homeDir = 'C:\\Users\\Administrator'

  const themeJson = JSON.stringify({
    background: '#F1F5F9',
    foreground: '#0F172A',
    cursor: '#2563EB',
    cursorAccent: '#FFFFFF',
    selectionBackground: '#DBEAFE',
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

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  const args = [
    '-p', String(port),
    '-i', '127.0.0.1',
    '--writable',
    '-t', 'fontSize=14',
    '-t', `theme=${themeJson}`,
    '-t', 'disableResizeOverlay=true',
    'cmd.exe',
  ]

  debugLog('Ttyd', `startLocalSession: spawning ttyd`, {
    sessionId,
    port,
    binaryPath: binary.path,
    args: args.join(' '),
    homeDir,
  })

  try {
    const child = spawn(binary.path, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: homeDir,
      env: { ...process.env, LANG: 'en_US.UTF-8' },
    })

    const session: TtydSession = {
      id: sessionId,
      serial: 'local',
      port,
      pid: child.pid || 0,
      process: child,
      status: 'starting',
    }

    sessions.set(sessionId, session)

    debugLog('Ttyd', `startLocalSession: process spawned, pid=${child.pid}`)

    child.stdout?.on('data', (data) => {
      debugLog('Ttyd', `[stdout] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      debugLog('Ttyd', `[stderr] ${data.toString().trim()}`)
    })

    child.on('error', (err) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      debugLog('Ttyd', `startLocalSession: process ERROR`, {
        sessionId,
        pid: child.pid,
        error: err.message,
        stack: err.stack,
      })
      console.error(`[Ttyd] Local session ${sessionId} error: ${err.message}`)
    })

    child.on('exit', (code, signal) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      debugLog('Ttyd', `startLocalSession: process EXIT`, {
        sessionId,
        pid: child.pid,
        exitCode: code,
        signal,
      })
      console.log(`[Ttyd] Local session ${sessionId} exited with code ${code}`)
    })

    const ready = await waitForReady(port)
    if (!ready) {
      debugLog('Ttyd', `startLocalSession: FAILED - ttyd not ready within timeout, killing process`)
      child.kill()
      sessions.delete(sessionId)
      return { error: 'Failed to start ttyd' }
    }

    session.status = 'running'
    debugLog('Ttyd', `startLocalSession: SUCCESS`, { sessionId, port, pid: child.pid })
    console.log(`[Ttyd] Local session ${sessionId} started on port ${port}`)
    return { sessionId, port }
  } catch (err) {
    sessions.delete(sessionId)
    debugLog('Ttyd', `startLocalSession: EXCEPTION`, { sessionId, error: String(err) })
    return { error: `Failed to start ttyd: ${err}` }
  }
}
