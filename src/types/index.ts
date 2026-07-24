export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  group?: string
  badge?: string | number
  children?: NavItem[]
}

export interface AdbDevice {
  serial: string
  model: string
  status?: string
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
  adbShellReconnect: (serial: string, oldId: string) => Promise<string | null>
  onShellData: (type: 'adb' | 'local', callback: (id: string, data: string) => void) => void
  onShellExit: (type: 'adb' | 'local', callback: (id: string) => void) => void
  localShellStart: () => Promise<string | null>
  localShellWrite: (id: string, data: string) => void
  localShellKill: (id: string) => void
  localShellFlushStdin: (id: string) => void
  localShellReconnect: (oldId: string) => Promise<string | null>
  loadHistory: () => Promise<HistoryResult>
  saveHistory: (history: string[]) => Promise<AdbResult>
  writeLog: (message: string) => Promise<AdbResult>
  memoryGetPids: (serial: string, names: string[]) => Promise<Record<string, number | null>>
  memoryPollStart: (opts: { serial: string; procs: { name: string; pid: number | null; dynamic: boolean }[]; intervalMs: number; showSystemMem: boolean }) => Promise<{ success: boolean }>
  memoryPollStop: () => Promise<{ success: boolean }>
  memoryShowmap: (serial: string, pid: number) => Promise<{ ok: boolean; data?: { pid: number; mappings: { name: string; vss: number; rss: number; pss: number; dirty: number }[] }; error?: string; needRoot?: boolean }>
  memoryDmabufDump: (serial: string, pid: number) => Promise<{ ok: boolean; data?: { pid: number; totalKb: number; groups: { sizeKb: number; count: number; totalKb: number }[] }; error?: string }>
  onMemorySamples: (callback: (samples: import('./memory').Sample[]) => void) => void
  onMemoryError: (callback: (error: { kind: string; message: string }) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
