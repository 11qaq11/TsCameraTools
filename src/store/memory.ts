import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  MemoryStage,
  DeviceInfo,
  ProcessStatus,
  Sample,
  ParsedDumpsys,
  DmabufPoint,
  ParsedMeminfo,
  ParsedDmabufDump,
  Timed
} from '../types/memory'

const MAX_PER_PID = 10

interface MemoryState {
  stage: MemoryStage
  serial: string | null
  device: DeviceInfo | null
  isRoot: boolean
  processes: ProcessStatus[]
  selectedNames: string[]
  polling: boolean
  intervalMs: number
  showSystemMem: boolean
  errorMessage: string | null
  dumpsysByName: Record<string, Timed<ParsedDumpsys>[]>
  dmabufByName: Record<string, Timed<DmabufPoint>[]>
  pidByName: Record<string, number | null>
  systemMem: Timed<ParsedMeminfo>[]
  peakDumpsys: Record<string, { ts: number; data: ParsedDumpsys }>
  peakDmabuf: Record<string, { ts: number; ionKb: number }>
  peakDmabufBreakdown: Record<string, ParsedDmabufDump | null>
  detailPid: number | null
  detailName: string | null
}

const initialState: MemoryState = {
  stage: 'device',
  serial: null,
  device: null,
  isRoot: false,
  processes: [],
  selectedNames: [],
  polling: false,
  intervalMs: 1000,
  showSystemMem: false,
  errorMessage: null,
  dumpsysByName: {},
  dmabufByName: {},
  pidByName: {},
  systemMem: [],
  peakDumpsys: {},
  peakDmabuf: {},
  peakDmabufBreakdown: {},
  detailPid: null,
  detailName: null,
}

const memorySlice = createSlice({
  name: 'memory',
  initialState,
  reducers: {
    setStage(state, action: PayloadAction<MemoryStage>) {
      state.stage = action.payload
    },
    setDevice(state, action: PayloadAction<DeviceInfo | null>) {
      state.device = action.payload
      state.serial = action.payload?.serial ?? null
    },
    setRoot(state, action: PayloadAction<boolean>) {
      state.isRoot = action.payload
    },
    setProcesses(state, action: PayloadAction<ProcessStatus[]>) {
      state.processes = action.payload
    },
    setSelected(state, action: PayloadAction<string[]>) {
      state.selectedNames = action.payload
    },
    setPolling(state, action: PayloadAction<boolean>) {
      state.polling = action.payload
    },
    setInterval(state, action: PayloadAction<number>) {
      state.intervalMs = action.payload
    },
    setShowSystemMem(state, action: PayloadAction<boolean>) {
      state.showSystemMem = action.payload
    },
    setDetail(state, action: PayloadAction<{ pid: number | null; name: string | null }>) {
      state.detailPid = action.payload.pid
      state.detailName = action.payload.name
    },
    setError(state, action: PayloadAction<string | null>) {
      state.errorMessage = action.payload
    },
    pushSamples(state, action: PayloadAction<Sample[]>) {
      for (const s of action.payload) {
        if (s.kind === 'dumpsys' && s.name != null) {
          const d = s.data as ParsedDumpsys
          const arr = [...(state.dumpsysByName[s.name] ?? []), { ts: s.timestamp, data: d }].slice(-MAX_PER_PID)
          state.dumpsysByName[s.name] = arr
          state.pidByName[s.name] = s.pid
          if (d.totalPss > (state.peakDumpsys[s.name]?.data.totalPss ?? -1)) {
            state.peakDumpsys[s.name] = { ts: s.timestamp, data: d }
          }
        } else if (s.kind === 'dmabuf' && s.name != null) {
          const d = s.data as DmabufPoint
          const arr = [...(state.dmabufByName[s.name] ?? []), { ts: s.timestamp, data: d }].slice(-MAX_PER_PID)
          state.dmabufByName[s.name] = arr
          if (d.ionKb > (state.peakDmabuf[s.name]?.ionKb ?? -1)) {
            state.peakDmabuf[s.name] = { ts: s.timestamp, ionKb: d.ionKb }
          }
        } else if (s.kind === 'meminfo') {
          state.systemMem = [...state.systemMem, { ts: s.timestamp, data: s.data as ParsedMeminfo }].slice(-MAX_PER_PID)
        }
      }
    },
    setPeakDmabufBreakdown(state, action: PayloadAction<{ name: string; breakdown: ParsedDmabufDump | null }>) {
      state.peakDmabufBreakdown[action.payload.name] = action.payload.breakdown
    },
    clearCapture(state) {
      state.dumpsysByName = {}
      state.dmabufByName = {}
      state.pidByName = {}
      state.systemMem = []
      state.peakDumpsys = {}
      state.peakDmabuf = {}
      state.peakDmabufBreakdown = {}
      state.errorMessage = null
    },
  },
})

export const {
  setStage,
  setDevice,
  setRoot,
  setProcesses,
  setSelected,
  setPolling,
  setInterval,
  setShowSystemMem,
  setDetail,
  setError,
  pushSamples,
  setPeakDmabufBreakdown,
  clearCapture,
} = memorySlice.actions

export default memorySlice.reducer
