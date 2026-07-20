import { contextBridge, ipcRenderer } from 'electron'
import type { DeviceInfo, ProcessEntry, ProcessStatus, CommandKind, Sample, ParsedShowmap, ParsedDmabufDump, ExportPayload } from '../shared/types'

const api = {
  env: {
    check: () => ipcRenderer.invoke('env:check')
  },
  adb: {
    devices: () => ipcRenderer.invoke('adb:devices') as Promise<{ ok: boolean; devices?: DeviceInfo[]; error?: string }>,
    setSerial: (serial: string | null) => ipcRenderer.invoke('adb:set-serial', serial),
    isRoot: () => ipcRenderer.invoke('adb:is-root') as Promise<{ root: boolean }>
  },
  process: {
    list: () => ipcRenderer.invoke('process:list') as Promise<ProcessEntry[]>,
    add: (name: string, alias?: string, note?: string, dynamic?: boolean) =>
      ipcRenderer.invoke('process:add', name, alias, note, dynamic),
    remove: (name: string) => ipcRenderer.invoke('process:remove', name),
    reset: () => ipcRenderer.invoke('process:reset') as Promise<{ ok: boolean; processes: ProcessEntry[] }>,
    refreshPids: (entries: ProcessEntry[]) =>
      ipcRenderer.invoke('process:refresh-pids', entries) as Promise<ProcessStatus[]>
  },
  capture: {
    start: (opts: { intervalMs: number; procs: { name: string; pid: number | null; dynamic: boolean }[]; showSystemMem: boolean }) =>
      ipcRenderer.invoke('capture:start', opts),
    stop: () => ipcRenderer.invoke('capture:stop'),
    setShowSystemMem: (b: boolean) => ipcRenderer.invoke('capture:set-show-system-mem', b),
    showmapOnce: (pid: number) =>
      ipcRenderer.invoke('capture:showmap-once', pid) as Promise<{ ok: boolean; data?: ParsedShowmap; error?: string }>,
    dmabufDumpOnce: (pid: number) =>
      ipcRenderer.invoke('capture:dmabuf-dump-once', pid) as Promise<{ ok: boolean; data?: ParsedDmabufDump; error?: string }>,
    exportXlsx: (payload: ExportPayload) =>
      ipcRenderer.invoke('capture:export-xlsx', payload) as Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>,
    onSamples: (cb: (samples: Sample[]) => void) => {
      const h = (_e: unknown, samples: Sample[]) => cb(samples)
      ipcRenderer.on('capture:sample-batch', h)
      return () => ipcRenderer.removeListener('capture:sample-batch', h)
    },
    onError: (cb: (e: { kind: CommandKind; message: string }) => void) => {
      const h = (_e: unknown, err: { kind: CommandKind; message: string }) => cb(err)
      ipcRenderer.on('capture:error', h)
      return () => ipcRenderer.removeListener('capture:error', h)
    },
    onPeak: (cb: (p: { name: string; breakdown: ParsedDmabufDump | null }) => void) => {
      const h = (_e: unknown, payload: { name: string; breakdown: ParsedDmabufDump | null }) => cb(payload)
      ipcRenderer.on('capture:peak', h)
      return () => ipcRenderer.removeListener('capture:peak', h)
    }
  },
  win: {
    startDrag: () => ipcRenderer.send('window:startDrag'),
    stopDrag: () => ipcRenderer.send('window:stopDrag'),
    toggleMaximize: () => ipcRenderer.send('window:toggleMaximize')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
