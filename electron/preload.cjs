const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  adbDevices: () => ipcRenderer.invoke('adb:devices'),
  adbRoot: (serial) => ipcRenderer.invoke('adb:root', serial),
  adbRemount: (serial) => ipcRenderer.invoke('adb:remount', serial),
  adbShellStart: (serial) => ipcRenderer.invoke('adb:shell:start', serial),
  adbShellWrite: (id, data) => ipcRenderer.send('adb:shell:write', id, data),
  adbShellKill: (id) => ipcRenderer.send('adb:shell:kill', id),
  onShellData: (callback) => {
    ipcRenderer.on('adb:shell:data', (_event, id, data) => callback(id, data))
  },
  onShellExit: (callback) => {
    ipcRenderer.on('adb:shell:exit', (_event, id) => callback(id))
  },
})
