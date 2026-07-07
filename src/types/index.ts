export interface AdbDevice {
  serial: string
  model: string
}

export interface AdbResult {
  success: boolean
  message: string
}

export interface HistoryResult {
  success: boolean
  history: string[]
  message?: string
}

export interface ElectronAPI {
  adbCheck: () => Promise<{ available: boolean }>
  adbInstall: () => Promise<AdbResult>
  adbDevices: () => Promise<AdbDevice[]>
  adbRoot: (serial: string) => Promise<AdbResult>
  adbRemount: (serial: string) => Promise<AdbResult>
  adbShellStart: (serial: string) => Promise<string | null>
  adbShellWrite: (id: string, data: string) => void
  adbShellKill: (id: string) => void
  adbShellFlushStdin: (id: string) => void
  onShellData: (callback: (id: string, data: string) => void) => void
  onShellExit: (callback: (id: string) => void) => void
  loadHistory: () => Promise<HistoryResult>
  saveHistory: (history: string[]) => Promise<AdbResult>
  writeLog: (message: string) => Promise<AdbResult>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
