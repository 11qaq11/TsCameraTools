// Mock Electron API
export const mockElectronAPI = {
  adbCheck: vi.fn().mockResolvedValue({ available: true }),
  adbInstall: vi.fn().mockResolvedValue({ success: true }),
  adbDevices: vi.fn().mockResolvedValue([]),
  adbRoot: vi.fn().mockResolvedValue({ success: true, message: 'Success' }),
  adbRemount: vi.fn().mockResolvedValue({ success: true, message: 'Success' }),
  adbShellStart: vi.fn().mockResolvedValue('session-1'),
  adbShellWrite: vi.fn(),
  adbShellKill: vi.fn(),
  adbShellFlushStdin: vi.fn(),
  onShellData: vi.fn(),
  onShellExit: vi.fn(),
  loadHistory: vi.fn().mockResolvedValue({ success: true, history: [] }),
  saveHistory: vi.fn().mockResolvedValue({ success: true }),
  writeLog: vi.fn().mockResolvedValue({ success: true }),
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
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  once: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
}

// Mock logger
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  getLogs: vi.fn().mockReturnValue([]),
  clearLogs: vi.fn(),
}

// Reset all mocks
export function resetMocks() {
  vi.clearAllMocks()
  Object.values(mockElectronAPI).forEach(fn => fn.mockClear())
  Object.values(mockSocket).forEach(fn => typeof fn === 'function' && fn.mockClear())
  Object.values(mockLogger).forEach(fn => typeof fn === 'function' && fn.mockClear())
}
