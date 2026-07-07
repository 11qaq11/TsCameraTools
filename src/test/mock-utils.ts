// Mock Electron API
export const mockElectronAPI = {
  adbCheck: () => Promise.resolve({ available: true }),
  adbInstall: () => Promise.resolve({ success: true }),
  adbDevices: () => Promise.resolve([]),
  adbRoot: () => Promise.resolve({ success: true, message: 'Success' }),
  adbRemount: () => Promise.resolve({ success: true, message: 'Success' }),
  adbShellStart: () => Promise.resolve('session-1'),
  adbShellWrite: () => {},
  adbShellKill: () => {},
  adbShellFlushStdin: () => {},
  onShellData: () => {},
  onShellExit: () => {},
  loadHistory: () => Promise.resolve({ success: true, history: [] }),
  saveHistory: () => Promise.resolve({ success: true }),
  writeLog: () => Promise.resolve({ success: true }),
}

// Setup window.electronAPI
export function setupElectronAPI() {
  Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
  })
}

// Mock Socket
export const mockSocket = {
  on: () => {},
  off: () => {},
  emit: () => {},
  once: () => {},
  connect: () => {},
  disconnect: () => {},
  connected: true,
}

// Mock logger
export const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  getLogs: () => [],
  clearLogs: () => {},
}

// Reset all mocks
export function resetMocks() {
  // No-op for production
}
