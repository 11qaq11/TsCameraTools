const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  adbCheck: () => ipcRenderer.invoke('adb:check'),
  adbInstall: () => ipcRenderer.invoke('adb:install'),
  adbDevices: () => ipcRenderer.invoke('adb:devices'),
  adbRoot: (serial) => ipcRenderer.invoke('adb:root', serial),
  adbRemount: (serial) => ipcRenderer.invoke('adb:remount', serial),
  adbShellStart: (serial) => ipcRenderer.invoke('adb:shell:start', serial),
  adbShellWrite: (id, data) => ipcRenderer.send('adb:shell:write', id, data),
  adbShellKill: (id) => ipcRenderer.send('adb:shell:kill', id),
  onShellData: (callback) => {
    const handler = (_event, id, data) => callback(id, data)
    ipcRenderer.removeAllListeners('adb:shell:data')
    ipcRenderer.on('adb:shell:data', handler)
  },
  onShellExit: (callback) => {
    const handler = (_event, id) => callback(id)
    ipcRenderer.removeAllListeners('adb:shell:exit')
    ipcRenderer.on('adb:shell:exit', handler)
  },
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (history) => ipcRenderer.invoke('history:save', history),
  writeLog: (message) => ipcRenderer.invoke('log:write', message),
})
