export type MemoryStage = 'device' | 'process' | 'dashboard' | 'detail' | 'dmabuf-detail'
export type CommandKind = 'meminfo' | 'dmabuf' | 'dumpsys' | 'showmap'

export interface DeviceInfo {
  serial: string
  state: 'device' | 'offline' | 'unauthorized'
  model?: string
}

export interface ProcessEntry {
  name: string
  alias?: string
  note?: string
  dynamic?: boolean
  category?: 'app' | 'service' | 'provider' | 'allocator' | 'algo' | 'kernel'
}

export interface ProcessStatus extends ProcessEntry {
  pid: number | null
  running: boolean
}

export interface DumpsysCategory {
  name: string
  pssTotal: number
  privateDirty: number
  privateClean: number
  swapPssDirty: number
  rss: number
}

export interface ParsedDumpsys {
  pid: number
  totalPss: number
  eglMtrackPss: number
  pssNoEgl: number
  totalRss: number
  totalPrivateDirty: number
  totalPrivateClean: number
  totalSwapPss: number
  categories: DumpsysCategory[]
}

export interface DmabufPoint {
  pid: number
  ionKb: number
}

export interface ParsedMeminfo {
  fields: Record<string, number>
}

export interface DmabufGroup {
  sizeKb: number
  count: number
  totalKb: number
}

export interface ParsedDmabufDump {
  pid: number
  totalKb: number
  groups: DmabufGroup[]
}

export interface ShowmapMapping {
  name: string
  vss: number
  rss: number
  pss: number
  dirty: number
}

export interface ParsedShowmap {
  pid: number
  mappings: ShowmapMapping[]
}

export interface Sample {
  kind: CommandKind
  name: string | null
  pid: number | null
  timestamp: number
  data: ParsedDumpsys | DmabufPoint | ParsedMeminfo
}

export interface Timed<T> {
  ts: number
  data: T
}
