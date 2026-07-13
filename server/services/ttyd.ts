import { spawn, type ChildProcess } from 'child_process'
import { createServer } from 'net'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { createChildLogger } from '../utils/logger.js'

const log = createChildLogger({ context: 'Ttyd' })

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
  log.debug(`findAvailablePort: scanning range ${start}-${end}`)
  for (let port = start; port <= end; port++) {
    const available = await isPortAvailable(port)
    log.debug(`  port ${port}: ${available ? 'available' : 'in use'}`)
    if (available) {
      log.debug(`findAvailablePort: selected port ${port}`)
      return port
    }
  }
  log.debug('findAvailablePort: no available port')
  return null
}

function waitForReady(port: number, timeoutMs = 5000): Promise<boolean> {
  log.debug(`waitForReady: checking port ${port}, timeout=${timeoutMs}ms`)
  return new Promise((resolve) => {
    const startTime = Date.now()
    let attempts = 0
    const check = async () => {
      attempts++
      try {
        const res = await fetch(`http://127.0.0.1:${port}/`)
        log.debug(`waitForReady: attempt ${attempts}, status=${res.status}, elapsed=${Date.now() - startTime}ms`)
        if (res.ok) {
          log.debug(`waitForReady: ready after ${attempts} attempts, ${Date.now() - startTime}ms`)
          resolve(true)
          return
        }
      } catch (err) {
        log.debug({ error: String(err) }, `waitForReady: attempt ${attempts}, not ready yet, elapsed=${Date.now() - startTime}ms`)
      }
      if (Date.now() - startTime > timeoutMs) {
        log.debug(`waitForReady: TIMEOUT after ${attempts} attempts, ${Date.now() - startTime}ms`)
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
  log.debug(`checkBinary: path=${ttydPath}, available=${available}`)
  return {
    available,
    version: '1.7.7',
    path: ttydPath,
  }
}

export async function startSession(serial: string): Promise<{ sessionId: string; port: number } | { error: string }> {
  log.debug(`startSession: serial=${serial}`)

  const binary = checkBinary()
  if (!binary.available) {
    log.error('startSession: FAILED - ttyd binary not found')
    return { error: 'ttyd binary not found' }
  }

  const port = await findAvailablePort()
  if (port === null) {
    log.error('startSession: FAILED - no available port')
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
    '-t', 'fontFamily=JetBrainsMono Nerd Font Mono, Cascadia Code, DengXian, Microsoft YaHei, monospace',
    '-t', `theme=${themeJson}`,
    '-t', `corsCredential=true`,
    '-t', `origin=${frontendUrl}`,
    '-t', 'disableResizeOverlay=true',
    'adb', '-s', serial, 'shell',
  ]

  log.debug({
    sessionId,
    port,
    serial,
    binaryPath: binary.path,
    args: args.join(' '),
    frontendUrl,
  }, 'startSession: spawning ttyd')

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

    log.debug(`startSession: process spawned, pid=${child.pid}`)

    child.stdout?.on('data', (data) => {
      log.debug(`[stdout] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      log.debug(`[stderr] ${data.toString().trim()}`)
    })

    child.on('error', (err) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      log.error({
        sessionId,
        pid: child.pid,
        error: err.message,
        stack: err.stack,
      }, 'startSession: process ERROR')
      console.error(`[Ttyd] Session ${sessionId} error: ${err.message}`)
    })

    child.on('exit', (code, signal) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      log.debug({
        sessionId,
        pid: child.pid,
        exitCode: code,
        signal,
      }, 'startSession: process EXIT')
      console.log(`[Ttyd] Session ${sessionId} exited with code ${code}`)
    })

    const ready = await waitForReady(port)
    if (!ready) {
      log.error('startSession: FAILED - ttyd not ready within timeout, killing process')
      child.kill()
      sessions.delete(sessionId)
      return { error: 'Failed to start ttyd' }
    }

    session.status = 'running'
    log.info({ sessionId, port, pid: child.pid }, 'startSession: SUCCESS')
    console.log(`[Ttyd] Session ${sessionId} started on port ${port}`)
    return { sessionId, port }
  } catch (err) {
    sessions.delete(sessionId)
    log.error({ sessionId, error: String(err) }, 'startSession: EXCEPTION')
    return { error: `Failed to start ttyd: ${err}` }
  }
}

export function stopSession(sessionId: string): boolean {
  log.debug(`stopSession: sessionId=${sessionId}`)
  const session = sessions.get(sessionId)
  if (!session) {
    log.debug('stopSession: session not found')
    return false
  }

  try {
    session.process.kill()
    log.debug(`stopSession: process killed, pid=${session.process.pid}`)
  } catch (err) {
    log.error({ error: String(err) }, 'stopSession: kill failed (process may already be dead)')
  }
  session.status = 'stopped'
  sessions.delete(sessionId)
  console.log(`[Ttyd] Session ${sessionId} stopped`)
  return true
}

export function getSessionStatus(sessionId: string): { status: string } | null {
  log.debug(`getSessionStatus: sessionId=${sessionId}`)
  const session = sessions.get(sessionId)
  if (!session) {
    log.debug('getSessionStatus: session not found')
    return null
  }
  log.debug(`getSessionStatus: status=${session.status}`)
  return { status: session.status }
}

export async function startLocalSession(): Promise<{ sessionId: string; port: number } | { error: string }> {
  log.debug('startLocalSession: starting local shell')

  const binary = checkBinary()
  if (!binary.available) {
    log.error('startLocalSession: FAILED - ttyd binary not found')
    return { error: 'ttyd binary not found' }
  }

  const port = await findAvailablePort()
  if (port === null) {
    log.error('startLocalSession: FAILED - no available port')
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
    '-t', 'fontFamily=JetBrainsMono Nerd Font Mono, Cascadia Code, DengXian, Microsoft YaHei, monospace',
    '-t', `theme=${themeJson}`,
    '-t', 'disableResizeOverlay=true',
    'cmd.exe',
  ]

  log.debug({
    sessionId,
    port,
    binaryPath: binary.path,
    args: args.join(' '),
    homeDir,
  }, 'startLocalSession: spawning ttyd')

  try {
    const child = spawn(binary.path, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: homeDir,
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
        PROMPT: '$P$G ',
      },
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

    log.debug(`startLocalSession: process spawned, pid=${child.pid}`)

    child.stdout?.on('data', (data) => {
      log.debug(`[stdout] ${data.toString().trim()}`)
    })

    child.stderr?.on('data', (data) => {
      log.debug(`[stderr] ${data.toString().trim()}`)
    })

    child.on('error', (err) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      log.error({
        sessionId,
        pid: child.pid,
        error: err.message,
        stack: err.stack,
      }, 'startLocalSession: process ERROR')
      console.error(`[Ttyd] Local session ${sessionId} error: ${err.message}`)
    })

    child.on('exit', (code, signal) => {
      session.status = 'stopped'
      sessions.delete(sessionId)
      log.debug({
        sessionId,
        pid: child.pid,
        exitCode: code,
        signal,
      }, 'startLocalSession: process EXIT')
      console.log(`[Ttyd] Local session ${sessionId} exited with code ${code}`)
    })

    const ready = await waitForReady(port)
    if (!ready) {
      log.error('startLocalSession: FAILED - ttyd not ready within timeout, killing process')
      child.kill()
      sessions.delete(sessionId)
      return { error: 'Failed to start ttyd' }
    }

    session.status = 'running'
    log.info({ sessionId, port, pid: child.pid }, 'startLocalSession: SUCCESS')
    console.log(`[Ttyd] Local session ${sessionId} started on port ${port}`)
    return { sessionId, port }
  } catch (err) {
    sessions.delete(sessionId)
    log.error({ sessionId, error: String(err) }, 'startLocalSession: EXCEPTION')
    return { error: `Failed to start ttyd: ${err}` }
  }
}
