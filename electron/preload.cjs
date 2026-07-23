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
  adbShellFlushStdin: (id) => ipcRenderer.send('adb:shell:flush-stdin', id),
  adbShellReconnect: (serial, oldId) => ipcRenderer.invoke('adb:shell:reconnect', serial, oldId),
  onShellData: (type, callback) => {
    const channel = type === 'adb' ? 'adb:shell:data' : 'local:shell:data'
    const handler = (_event, id, data) => callback(id, data)
    ipcRenderer.removeAllListeners(channel)
    ipcRenderer.on(channel, handler)
  },
  onShellExit: (type, callback) => {
    const channel = type === 'adb' ? 'adb:shell:exit' : 'local:shell:exit'
    const handler = (_event, id) => callback(id)
    ipcRenderer.removeAllListeners(channel)
    ipcRenderer.on(channel, handler)
  },
  localShellStart: () => ipcRenderer.invoke('local:shell:start'),
  localShellWrite: (id, data) => ipcRenderer.send('local:shell:write', id, data),
  localShellKill: (id) => ipcRenderer.send('local:shell:kill', id),
  localShellFlushStdin: (id) => ipcRenderer.send('local:shell:flush-stdin', id),
  localShellReconnect: (oldId) => ipcRenderer.invoke('local:shell:reconnect', oldId),
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (history) => ipcRenderer.invoke('history:save', history),
  writeLog: (message) => ipcRenderer.invoke('log:write', message),
})
