const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn, execSync } = require('child_process')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'TsCameraTools',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ADB: list connected devices
ipcMain.handle('adb:devices', async () => {
  try {
    const output = execSync('adb devices -l', { encoding: 'utf-8', timeout: 5000 })
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
  try {
    const output = execSync(`adb -s ${serial} root`, { encoding: 'utf-8', timeout: 10000 })
    return { success: true, message: output.trim() }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ADB: remount
ipcMain.handle('adb:remount', async (_event, serial) => {
  try {
    const output = execSync(`adb -s ${serial} remount`, { encoding: 'utf-8', timeout: 10000 })
    return { success: true, message: output.trim() }
  } catch (e) {
    return { success: false, message: e.message }
  }
})

// ADB: spawn shell (returns channel id for pty communication)
const shells = new Map()

ipcMain.handle('adb:shell:start', async (_event, serial) => {
  const id = `${serial}-${Date.now()}`
  const proc = spawn('adb', ['-s', serial, 'shell'], {
    env: process.env,
  })
  shells.set(id, proc)

  proc.stdout.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data.toString())
    }
  })
  proc.stderr.on('data', (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:data', id, data.toString())
    }
  })
  proc.on('close', () => {
    shells.delete(id)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adb:shell:exit', id)
    }
  })

  return id
})

ipcMain.on('adb:shell:write', (_event, id, data) => {
  const proc = shells.get(id)
  if (proc && proc.stdin.writable) {
    proc.stdin.write(data)
  }
})

ipcMain.on('adb:shell:kill', (_event, id) => {
  const proc = shells.get(id)
  if (proc) {
    proc.kill()
    shells.delete(id)
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
