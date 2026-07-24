const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn, exec, execSync } = require('child_process')
const fs = require('fs')
const https = require('https')
const { createWriteStream } = require('fs')
const pino = require('pino')

let mainWindow

const ADB_DIR = path.join(app.getPath('userData'), 'platform-tools')
const ADB_EXE = path.join(ADB_DIR, 'adb.exe')
const LOGS_DIR = path.join(process.cwd(), 'logs')

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

// Pino logger → logs/electron-main.log
const log = pino({ level: 'debug' }, pino.destination(path.join(LOGS_DIR, 'electron-main.log')))

// Global crash handlers
process.on('uncaughtException', (err) => {
  log.fatal({ error: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION')
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  log.error({ reason: String(reason) }, 'UNHANDLED REJECTION')
})

function getLogFilePath() {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return path.join(LOGS_DIR, `${timestamp}.log`)
}

function getAdbPath() {
  try {
    execSync('adb version', { encoding: 'utf-8', timeout: 3000 })
    return 'adb'
  } catch (err) {
    log.debug({ error: err.message }, 'getAdbPath: adb not in PATH')
  }
  if (fs.existsSync(ADB_EXE)) return ADB_EXE
  return null
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TsCameraTools',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => { mainWindow.show() })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ADB: check if adb is available
ipcMain.handle('adb:check', async () => {
  return { available: getAdbPath() !== null }
})

// ADB: install (download platform-tools)
ipcMain.handle('adb:install', async () => {
  const zipPath = path.join(app.getPath('temp'), 'platform-tools.zip')
  const url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'

  try {
    // Download
    await new Promise((resolve, reject) => {
      const file = createWriteStream(zipPath)
      https.get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          https.get(res.headers.location, (res2) => {
            res2.pipe(file)
            file.on('finish', () => { file.close(); resolve() })
          }).on('error', reject)
        } else {
          res.pipe(file)
          file.on('finish', () => { file.close(); resolve() })
        }
      }).on('error', reject)
    })

    // Extract using PowerShell
    const dest = app.getPath('userData')
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${dest}' -Force"`,
      { timeout: 60000 }
    )

    // Cleanup zip
    fs.unlinkSync(zipPath)

    if (fs.existsSync(ADB_EXE)) {
      return { success: true, message: 'ADB 安装成功' }
    }
    return { success: false, message: '解压完成但未找到 adb.exe' }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ADB: list connected devices
ipcMain.handle('adb:devices', async () => {
  const adb = getAdbPath()
  if (!adb) return []
  try {
    const output = execSync(`"${adb}" devices -l`, { encoding: 'utf-8', timeout: 5000 })
    const lines = output.trim().split('\n').slice(1)
    return lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const serial = parts[0]
        const status = parts[1] || 'unknown'
        const model = line.match(/model:(\S+)/)?.[1] || serial
        return { serial, model, status }
      })
  } catch (err) {
    log.error({ error: err.message }, 'adb:devices failed')
    return []
  }
})

// ADB: root
ipcMain.handle('adb:root', async (_event, serial) => {
  const adb = getAdbPath()
  if (!adb) return { success: false, message: 'ADB 未安装' }
  try {
    const output = execSync(`"${adb}" -s ${serial} root`, { encoding: 'utf-8', timeout: 10000 })
    return { success: true, message: output.trim() }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ADB: remount
ipcMain.handle('adb:remount', async (_event, serial) => {
  const adb = getAdbPath()
  if (!adb) return { success: false, message: 'ADB 未安装' }
  try {
    const output = execSync(`"${adb}" -s ${serial} remount`, { encoding: 'utf-8', timeout: 10000 })
    return { success: true, message: output.trim() }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ADB: spawn shell
const shells = new Map()

ipcMain.handle('adb:shell:start', async (_event, serial) => {
  const adb = getAdbPath()
  if (!adb) return null
  const id = `${serial}-${Date.now()}`
  const startTime = Date.now()

  log.info(`[IME-DEBUG] Starting ADB shell:`, { id, serial, adb })

  const proc = spawn(adb, ['-s', serial, 'shell'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: false,
    env: { ...process.env, LANG: 'en_US.UTF-8' },
  })
  shells.set(id, proc)

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
  proc.stdin.setDefaultEncoding('utf-8')

  proc.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data)
    }
  })
  proc.stderr.on('data', (data) => {
    log.error(`[IME-DEBUG] ADB shell stderr:`, { id, data: data.toString().substring(0, 200) })
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data)
    }
  })
  proc.on('error', (err) => {
    log.error(`[IME-DEBUG] ADB shell process ERROR:`, { id, error: err.message })
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`)
    }
  })
  proc.on('close', (code, signal) => {
    const uptime = Date.now() - startTime
    log.error(`[IME-DEBUG] ADB shell process CLOSED:`, {
      id,
      exitCode: code,
      signal,
      pid: proc.pid,
      uptimeMs: uptime,
    })
    shells.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:exit', id)
    }
  })

  // Trigger initial prompt
  proc.stdin.write('\n')
  return id
})

ipcMain.on('adb:shell:write', (_event, id, data) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    try {
      const hasChinese = /[\u4e00-\u9fff]/.test(data)
      if (hasChinese) {
        const hex = Buffer.from(data, 'utf-8').toString('hex')
        log.info(`[IME-DEBUG] adb:shell:write Chinese:`, {
          id,
          data: data.substring(0, 30),
          hex,
          length: data.length,
          stdinWritable: proc.stdin.writable,
          stdinDestroyed: proc.stdin.destroyed,
          pid: proc.pid,
        })
      }
      proc.stdin.write(data.replace(/\r/g, '\n'))
      if (hasChinese) {
        log.info(`[IME-DEBUG] adb:shell:write Chinese SUCCESS`)
      }
    } catch (err) {
      log.error(`[IME-DEBUG] adb:shell:write ERROR:`, { id, error: err.message })
    }
  } else {
    log.error(`[IME-DEBUG] adb:shell:write SKIPPED (proc not ready):`, {
      id,
      hasProc: !!proc,
      hasStdin: !!(proc && proc.stdin),
      destroyed: proc && proc.stdin ? proc.stdin.destroyed : 'N/A',
    })
  }
})

ipcMain.on('adb:shell:kill', (_event, id) => {
  const proc = shells.get(id)
  if (proc) {
    try { proc.kill() } catch (err) { log.error({ id, error: err.message }, 'shell kill failed') }
    shells.delete(id)
  }
})

ipcMain.on('adb:shell:flush-stdin', (_event, id) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    try { proc.stdin.write('\x03\n') } catch (err) { log.error({ id, error: err.message }, 'flush-stdin failed') }
  }
})

// ADB: reconnect shell (kill old, spawn new)
ipcMain.handle('adb:shell:reconnect', async (_event, serial, oldId) => {
  const oldProc = shells.get(oldId)
  if (oldProc) {
    oldProc.kill()
    shells.delete(oldId)
  }
  const adb = getAdbPath()
  if (!adb) return null
  const id = `${serial}-${Date.now()}`

  const proc = spawn(adb, ['-s', serial, 'shell'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: false,
    env: { ...process.env, LANG: 'en_US.UTF-8' },
  })
  shells.set(id, proc)

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
  proc.stdin.setDefaultEncoding('utf-8')

  proc.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data)
    }
  })
  proc.stderr.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data)
    }
  })
  proc.on('error', (err) => {
    log.error(`[ADB Shell] Reconnect error for ${id}:`, err.message)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`)
    }
  })
  proc.on('close', (code) => {
    log.info(`[ADB Shell] Process closed for ${id} with code ${code}`)
    shells.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:exit', id)
    }
  })

  proc.stdin.write('\n')
  return id
})

// Local shell: spawn cmd.exe
ipcMain.handle('local:shell:start', async () => {
  const id = `local-${Date.now()}`
  log.info(`Starting local shell: ${id}`)

  const proc = spawn('cmd.exe', [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: false,
  })
  shells.set(id, proc)

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')

  proc.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('local:shell:data', id, data)
    }
  })
  proc.stderr.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('local:shell:data', id, data)
    }
  })
  proc.on('error', (err) => {
    log.error(`Local shell error ${id}: ${err.message}`)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('local:shell:data', id, `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`)
    }
  })
  proc.on('close', (code) => {
    log.info(`Local shell closed ${id} with code ${code}`)
    shells.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('local:shell:exit', id)
    }
  })

  proc.stdin.write('\n')
  return id
})

ipcMain.on('local:shell:write', (_event, id, data) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    try { proc.stdin.write(data.replace(/\r/g, '\n')) } catch {}
  }
})

ipcMain.on('local:shell:kill', (_event, id) => {
  const proc = shells.get(id)
  if (proc) {
    try { proc.kill() } catch {}
    shells.delete(id)
  }
})

ipcMain.on('local:shell:flush-stdin', (_event, id) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    try { proc.stdin.write('\x03\n') } catch {}
  }
})

// Local shell: reconnect
ipcMain.handle('local:shell:reconnect', async (_event, oldId) => {
  const oldProc = shells.get(oldId)
  if (oldProc) {
    oldProc.kill()
    shells.delete(oldId)
  }
  const id = `local-${Date.now()}`
  const proc = spawn('cmd.exe', [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: false })
  shells.set(id, proc)
  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')
  proc.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('local:shell:data', id, data)
  })
  proc.stderr.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('local:shell:data', id, data)
  })
  proc.on('close', (code) => {
    shells.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('local:shell:exit', id)
  })
  proc.stdin.write('\n')
  return id
})

// History: load from file
ipcMain.handle('history:load', async () => {
  const historyPath = path.join(process.cwd(), '.adb-command-history.json')
  try {
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, 'utf-8')
      const parsed = JSON.parse(data)
      return { success: true, history: parsed.history || [] }
    }
    return { success: true, history: [] }
  } catch (e) {
    return { success: false, history: [], message: e.message }
  }
})

// History: save to file
ipcMain.handle('history:save', async (_event, history) => {
  const historyPath = path.join(process.cwd(), '.adb-command-history.json')
  try {
    fs.writeFileSync(historyPath, JSON.stringify({ history, version: 1 }, null, 2))
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// Log: write to file (from renderer process)
const rendererLog = pino({ level: 'debug' }, pino.destination(path.join(LOGS_DIR, 'renderer.log')))
ipcMain.handle('log:write', async (_event, message) => {
  try {
    rendererLog.info({ source: 'renderer' }, message)
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ======== Memory Analysis ========

// --- ADB helpers ---
function execAdb(args) {
  const adb = getAdbPath()
  if (!adb) return Promise.reject(new Error('ADB not available'))
  const cmd = `"${adb}" ${args.join(' ')}`
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'utf-8', timeout: 15000, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message))
      else resolve(stdout)
    })
  })
}

function shell(serial, cmd) {
  return execAdb(['-s', serial, 'shell', cmd])
}

function pidOfFast(serial, name) {
  if (!/^[A-Za-z0-9._@-]+$/.test(name)) return Promise.resolve(null)
  return shell(serial, `pidof ${name}`)
    .then((out) => {
      const pid = out.trim().split(/\s+/)[0]
      return pid && /^\d+$/.test(pid) ? Number(pid) : null
    })
    .catch(() => null)
}

// --- Parsers (ported from server/parsers/) ---

function parseDumpsysMeminfo(output) {
  const lines = output.split('\n')

  let pid = 0
  for (const line of lines) {
    const m = line.match(/MEMINFO in pid\s+(\d+)/)
    if (m) { pid = parseInt(m[1], 10); break }
  }

  function extractTotal(prefix) {
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith(prefix)) {
        const m = trimmed.match(/(\d+)/)
        if (m) return parseInt(m[1], 10)
      }
    }
    if (prefix === 'TOTAL PSS:') {
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('TOTAL ')) {
          const cols = trimmed.split(/\s+/)
          if (cols.length >= 2) return parseInt(cols[1], 10) || 0
        }
      }
    }
    return 0
  }

  const totalPss = extractTotal('TOTAL PSS:')
  const totalRss = extractTotal('TOTAL RSS:')
  const totalPrivateDirty = extractTotal('TOTAL PRIVATE DIRTY:')
  const totalPrivateClean = extractTotal('TOTAL PRIVATE CLEAN:')
  const totalSwapPss = extractTotal('TOTAL SWAP PSS:')

  let eglMtrackPss = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('EGL mtrack')) {
      const cols = trimmed.split(/\s+/)
      eglMtrackPss = parseInt(cols[2] || '0', 10) || 0
      break
    }
  }

  const categories = []
  let inTable = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('App Summary')) break
    if (!inTable) {
      if (/^\s*Pss\(kB\)/.test(line) || /^\s*Pss\s+Private/.test(line)) { inTable = true }
      continue
    }
    if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('TOTAL')) continue
    const m = trimmed.match(/^(\S(?:.*\S)?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/)
    if (m) {
      categories.push({
        name: m[1],
        pssTotal: parseInt(m[2], 10) || 0,
        privateDirty: parseInt(m[3], 10) || 0,
        privateClean: parseInt(m[4], 10) || 0,
        swapPssDirty: parseInt(m[5], 10) || 0,
        rss: parseInt(m[6], 10) || 0,
      })
    }
  }

  return { pid, totalPss, eglMtrackPss, pssNoEgl: totalPss - eglMtrackPss, totalRss, totalPrivateDirty, totalPrivateClean, totalSwapPss, categories }
}

function parseMeminfoIon(output) {
  const result = new Map()
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const m = trimmed.match(/^(\d+)\s*[:\s]\s*(\d+)/)
    if (m) result.set(parseInt(m[1], 10), parseInt(m[2], 10))
  }
  return result
}

function parseMeminfo(output) {
  const fields = {}
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(/^([\w()]+):\s+(\d+)/)
    if (m) fields[m[1]] = parseInt(m[2], 10)
  }
  return { fields }
}

function parseShowmap(pid, output) {
  const mappings = []
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('---') || trimmed.startsWith('virtual') || /^NAME\s+/.test(trimmed)) continue
    const cols = trimmed.split(/\s+/)
    if (cols.length < 6) continue
    const vss = parseInt(cols[0], 10)
    const rss = parseInt(cols[1], 10)
    const pss = parseInt(cols[2], 10)
    const dirty = parseInt(cols[5], 10) || 0
    const nameMatch = trimmed.match(/\S+\s+(.+)$/)
    const name = nameMatch ? nameMatch[1].trim() : cols[cols.length - 1]
    if (!isNaN(vss) && !isNaN(rss) && !isNaN(pss)) {
      mappings.push({ name, vss, rss, pss, dirty })
    }
  }
  mappings.sort((a, b) => b.pss - a.pss)
  return { pid, mappings: mappings.slice(0, 30) }
}

function parseDmabufDump(pid, output) {
  const sizeMap = new Map()
  let totalKb = 0
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue
    const sizeMatch = trimmed.match(/size[:\s]+(\d+)/i)
    if (sizeMatch) {
      const sizeBytes = parseInt(sizeMatch[1], 10)
      const sizeKb = Math.round(sizeBytes / 1024) || sizeBytes
      totalKb += sizeKb
      const g = sizeMap.get(sizeKb) || { count: 0, totalKb: 0 }
      g.count++
      g.totalKb += sizeKb
      sizeMap.set(sizeKb, g)
      continue
    }
    const cols = trimmed.split(/\s+/)
    if (cols.length >= 3) {
      const size = parseInt(cols[2], 10)
      if (!isNaN(size) && size > 0) {
        const sizeKb = Math.round(size / 1024) || size
        totalKb += sizeKb
        const g = sizeMap.get(sizeKb) || { count: 0, totalKb: 0 }
        g.count++
        g.totalKb += sizeKb
        sizeMap.set(sizeKb, g)
      }
    }
  }
  const groups = [...sizeMap.entries()]
    .map(([sizeKb, v]) => ({ sizeKb, count: v.count, totalKb: v.totalKb }))
    .sort((a, b) => b.totalKb - a.totalKb)
  return { pid, totalKb, groups }
}

// --- Memory Poller ---

let memPollerTimer = null
let memPollerRunning = false

function zeroDumpsys() {
  return { pid: 0, totalPss: 0, eglMtrackPss: 0, pssNoEgl: 0, totalRss: 0, totalPrivateDirty: 0, totalPrivateClean: 0, totalSwapPss: 0, categories: [] }
}

async function captureTick() {
  if (!memPollerState || !memPollerRunning) return

  const ts = Date.now()
  const samples = []
  const { serial, monitored, showSystemMem } = memPollerState

  // PID resolve for dynamic/needsResolve
  for (const p of monitored) {
    if (p.dynamic || p.needsResolve) {
      p.pid = await pidOfFast(serial, p.name)
      p.needsResolve = false
    }
  }

  // ion allocation
  let ionMap = new Map()
  try {
    const out = await shell(serial, 'cat /proc/meminfo_ion')
    ionMap = parseMeminfoIon(out)
  } catch (e) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('memory:error', { kind: 'dmabuf', message: e.message })
    }
  }

  // dumpsys meminfo for each monitored proc
  for (const p of monitored) {
    if (p.pid != null) {
      try {
        const out = await shell(serial, `dumpsys meminfo ${p.pid}`)
        const parsed = parseDumpsysMeminfo(out)
        if (!p.dynamic && parsed.categories.length === 0) {
          p.pid = null
          p.needsResolve = true
          samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
        } else {
          samples.push({ kind: 'dumpsys', name: p.name, pid: p.pid, timestamp: ts, data: parsed })
        }
      } catch (e) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('memory:error', { kind: 'dumpsys', message: e.message })
        }
      }
    } else {
      samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
    }
  }

  // system meminfo
  if (showSystemMem) {
    try {
      const out = await shell(serial, 'cat /proc/meminfo')
      samples.push({ kind: 'meminfo', name: null, pid: null, timestamp: ts, data: parseMeminfo(out) })
    } catch (e) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('memory:error', { kind: 'meminfo', message: e.message })
      }
    }
  }

  // Ion distribution per PID
  for (const p of monitored) {
    const ionKb = p.pid != null ? ionMap.get(p.pid) ?? 0 : 0
    samples.push({ kind: 'dmabuf', name: p.name, pid: p.pid, timestamp: ts, data: { pid: p.pid ?? 0, ionKb } })
    if (p.pid != null && ionKb > (p.peakIonKb || 0)) p.peakIonKb = ionKb
  }

  if (samples.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('memory:samples', samples)
  }
}

function scheduleNextTick(intervalMs) {
  memPollerTimer = setTimeout(async () => {
    if (!memPollerRunning) return
    const start = Date.now()
    await captureTick()
    if (memPollerRunning) {
      const delay = Math.max(0, intervalMs - (Date.now() - start))
      memPollerTimer = setTimeout(() => scheduleNextTick(intervalMs), delay)
    }
  }, 0)
}

let memPollerState = null

// IPC: get PIDs for process names
ipcMain.handle('memory:get-pids', async (_event, serial, names) => {
  if (!serial) return {}
  const results = {}
  for (const name of names) {
    results[name] = await pidOfFast(serial, name)
  }
  return results
})

// IPC: start polling
ipcMain.handle('memory:poll:start', async (_event, opts) => {
  memPollerRunning = false
  if (memPollerTimer) { clearTimeout(memPollerTimer); memPollerTimer = null }

  const monitored = opts.procs.map((p) => ({
    name: p.name,
    pid: p.pid,
    dynamic: p.dynamic,
    needsResolve: true,
    peakIonKb: 0,
  }))

  memPollerState = {
    serial: opts.serial,
    monitored,
    intervalMs: opts.intervalMs,
    showSystemMem: opts.showSystemMem,
  }
  memPollerRunning = true

  log.info({ serial: opts.serial, intervalMs: opts.intervalMs, procCount: monitored.length }, 'Memory poller started')
  scheduleNextTick(opts.intervalMs)
  return { success: true }
})

// IPC: stop polling
ipcMain.handle('memory:poll:stop', async () => {
  memPollerRunning = false
  if (memPollerTimer) { clearTimeout(memPollerTimer); memPollerTimer = null }
  memPollerState = null
  log.info('Memory poller stopped')
  return { success: true }
})

// IPC: showmap
ipcMain.handle('memory:showmap', async (_event, serial, pid) => {
  try {
    const out = await shell(serial, `showmap ${pid}`)
    if (out.includes('Failed to parse file') || out.includes('Permission denied')) {
      return { ok: false, error: '需要root权限才能读取smaps文件。请确保设备已root并使用adb root命令。', needRoot: true }
    }
    return { ok: true, data: parseShowmap(Number(pid), out) }
  } catch (e) {
    const errMsg = e.message
    if (errMsg.includes('Failed to parse') || errMsg.includes('Permission denied') || errMsg.includes('smaps')) {
      return { ok: false, error: '需要root权限才能读取smaps文件。请确保设备已root并使用adb root命令。', needRoot: true }
    }
    return { ok: false, error: errMsg }
  }
})

// IPC: dmabuf_dump
ipcMain.handle('memory:dmabuf-dump', async (_event, serial, pid) => {
  try {
    const out = await shell(serial, `dmabuf_dump ${pid}`)
    return { ok: true, data: parseDmabufDump(Number(pid), out) }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

app.whenReady().then(createWindow).catch((err) => {
  log.fatal({ error: err.message, stack: err.stack }, 'createWindow failed')
})

app.on('window-all-closed', () => {
  for (const proc of shells.values()) {
    try { proc.kill() } catch {}
  }
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
