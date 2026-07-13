const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')
const fs = require('fs')
const https = require('https')
const { createWriteStream } = require('fs')

let mainWindow

const ADB_DIR = path.join(app.getPath('userData'), 'platform-tools')
const ADB_EXE = path.join(ADB_DIR, 'adb.exe')
const LOGS_DIR = path.join(process.cwd(), 'logs')

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

function getLogFilePath() {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return path.join(LOGS_DIR, `${timestamp}.log`)
}

function getAdbPath() {
  try {
    execSync('adb version', { encoding: 'utf-8', timeout: 3000 })
    return 'adb'
  } catch {}
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
      .filter(line => line.includes('device'))
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const serial = parts[0]
        const model = line.match(/model:(\S+)/)?.[1] || serial
        return { serial, model }
      })
  } catch {
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

  const proc = spawn(adb, ['-s', serial, 'shell'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: false,
    env: { ...process.env, LANG: 'en_US.UTF-8' },
  })
  shells.set(id, proc)

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')

  // 设置 stdin 编码为 utf-8
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
    console.error(`[ADB Shell] Process error for ${id}:`, err.message)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, `\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`)
    }
  })
  proc.on('close', (code) => {
    console.log(`[ADB Shell] Process closed for ${id} with code ${code}`)
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
      proc.stdin.write(data.replace(/\r/g, '\n'))
    } catch (err) {
      console.error(`[ADB Shell] Write error for ${id}:`, err.message)
    }
  }
})

ipcMain.on('adb:shell:kill', (_event, id) => {
  const proc = shells.get(id)
  if (proc) { proc.kill(); shells.delete(id) }
})

ipcMain.on('adb:shell:flush-stdin', (_event, id) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    proc.stdin.write('\x03\n')
  }
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

// Log: write to file
ipcMain.handle('log:write', async (_event, message) => {
  try {
    const logFile = getLogFilePath()
    fs.appendFileSync(logFile, message + '\n')
    return { success: true }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  for (const proc of shells.values()) proc.kill()
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
