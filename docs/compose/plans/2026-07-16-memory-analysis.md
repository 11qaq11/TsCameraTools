# 内存分析功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Android 内存抓取分析工具的核心功能集成到 TsCameraTools 项目中，实现设备选择、进程管理、实时内存监控、趋势可视化、详情分析和数据导出。

**Architecture:** 后端在 Express 中新增内存分析路由，通过 ADB 命令采集数据并解析；前端使用 Redux Toolkit 管理状态，ECharts 绘制趋势图，Tailwind CSS 构建 UI。实时数据通过 WebSocket 推送。

**Tech Stack:** Express, WebSocket, Redux Toolkit, ECharts, Tailwind CSS, xlsx (exceljs)

## Global Constraints

- 复用现有 ADB 配置（`config.adb.path`）
- 内存口径对齐 camera-memory-fetcher（PSS 减 EGL mtrack，dmabuf 用分配者口径）
- 进程名入 adb shell 前校验（`/^[A-Za-z0-9._@-]+$/`），防命令注入
- UI 语言：中文
- 所有内存数据单位：KB（整数）

---

## 文件结构

### 后端（server/）
- `server/routes/memory.ts` - 内存分析路由（设备、进程、抓取、导出）
- `server/services/memory-poller.ts` - 内存轮询服务（WebSocket 推送）
- `server/parsers/dumpsys-meminfo.ts` - dumpsys meminfo 解析器
- `server/parsers/meminfo-ion.ts` - /proc/meminfo_ion 解析器
- `server/parsers/meminfo.ts` - /proc/meminfo 解析器
- `server/parsers/dmabuf-dump.ts` - dmabuf_dump 解析器
- `server/parsers/showmap.ts` - showmap 解析器

### 前端（src/）
- `src/pages/MemoryAnalysis.tsx` - 内存分析主页面
- `src/pages/memory/DeviceSelect.tsx` - 设备选择组件
- `src/pages/memory/ProcessManager.tsx` - 进程管理组件
- `src/pages/memory/Dashboard.tsx` - 抓取面板组件
- `src/pages/memory/DetailPage.tsx` - meminfo 详情页
- `src/pages/memory/DmabufDetailPage.tsx` - dmabuf 详情页
- `src/store/memory.ts` - Redux slice
- `src/components/memory/TrendChart.tsx` - 趋势图组件
- `src/components/memory/MiniList.tsx` - 数值列表组件
- `src/components/memory/ProcessCard.tsx` - 进程卡片组件
- `src/types/memory.ts` - 类型定义

---

## Task 1: 类型定义与 Redux Slice

**Covers:** 基础数据结构

**Files:**
- Create: `src/types/memory.ts`
- Create: `src/store/memory.ts`
- Modify: `src/store/index.ts`

**Interfaces:**
- Produces: `MemoryState`, `Sample`, `ParsedDumpsys`, `DmabufPoint`, `ParsedMeminfo` 等类型

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/types/memory.ts

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
```

- [ ] **Step 2: 创建 Redux Slice**

```typescript
// src/store/memory.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
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
```

- [ ] **Step 3: 注册到 Store**

修改 `src/store/index.ts`，添加 memory reducer。

- [ ] **Step 4: 验证类型检查**

```bash
npm run web:build
```

- [ ] **Step 5: Commit**

```bash
git add src/types/memory.ts src/store/memory.ts src/store/index.ts
git commit -m "feat: add memory analysis types and Redux slice"
```

---

## Task 2: 后端解析器

**Covers:** 数据解析逻辑

**Files:**
- Create: `server/parsers/dumpsys-meminfo.ts`
- Create: `server/parsers/meminfo-ion.ts`
- Create: `server/parsers/meminfo.ts`
- Create: `server/parsers/dmabuf-dump.ts`
- Create: `server/parsers/showmap.ts`

**Interfaces:**
- Produces: `parseDumpsysMeminfo()`, `parseMeminfoIon()`, `parseMeminfo()`, `parseDmabufDump()`, `parseShowmap()`

- [ ] **Step 1: 创建 dumpsys-meminfo 解析器**

```typescript
// server/parsers/dumpsys-meminfo.ts

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

export function parseDumpsysMeminfo(stdout: string): ParsedDumpsys {
  const pidMatch = stdout.match(/MEMINFO in pid\s+(\d+)/)
  const pid = pidMatch ? Number(pidMatch[1]) : 0
  const categories: DumpsysCategory[] = []
  let totalPss = 0
  let totalRss = 0
  let totalPrivateDirty = 0
  let totalPrivateClean = 0
  let totalSwapPss = 0

  const lines = stdout.split(/\r?\n/)
  let inTable = false
  for (const line of lines) {
    if (/^\s*Pss\s+Private\s+Private\s+Swap\S*\s+Rss/.test(line)) {
      inTable = true
      continue
    }
    if (!inTable) continue
    if (/^\s*Total\s+/.test(line)) continue
    if (/^\s*-{3,}/.test(line) || line.trim() === '') {
      if (categories.length > 0) break
      continue
    }
    const m = line.match(/^\s+([\w. ()/]+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/)
    if (m) {
      const [, name, pss, pdirty, pclean, swap, rss] = m
      if (name.trim().toUpperCase() === 'TOTAL') {
        totalPss = Number(pss)
        totalRss = Number(rss)
        totalPrivateDirty = Number(pdirty)
        totalPrivateClean = Number(pclean)
        totalSwapPss = Number(swap)
        continue
      }
      categories.push({
        name: name.trim(),
        pssTotal: Number(pss),
        privateDirty: Number(pdirty),
        privateClean: Number(pclean),
        swapPssDirty: Number(swap),
        rss: Number(rss)
      })
    }
  }

  const eglMtrackPss = categories.find((c) => c.name === 'EGL mtrack')?.pssTotal ?? 0
  const pssNoEgl = totalPss - eglMtrackPss

  return { pid, totalPss, eglMtrackPss, pssNoEgl, totalRss, totalPrivateDirty, totalPrivateClean, totalSwapPss, categories }
}
```

- [ ] **Step 2: 创建 meminfo-ion 解析器**

```typescript
// server/parsers/meminfo-ion.ts

export function parseMeminfoIon(stdout: string): Map<number, number> {
  const tokens = stdout.trim().split(/\s+/)
  const map = new Map<number, number>()
  for (let i = 2; i + 1 < tokens.length; i += 3) {
    const pid = Number(tokens[i])
    const size = Number(tokens[i + 1])
    if (Number.isInteger(pid) && pid > 0 && Number.isFinite(size)) {
      map.set(pid, Math.round(size / 1024))
    }
  }
  return map
}
```

- [ ] **Step 3: 创建 meminfo 解析器**

```typescript
// server/parsers/meminfo.ts

export interface ParsedMeminfo {
  fields: Record<string, number>
}

export function parseMeminfo(stdout: string): ParsedMeminfo {
  const fields: Record<string, number> = {}
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s+(\d+)\s*kB\s*$/)
    if (m) {
      fields[m[1]] = Number(m[2])
    }
  }
  return { fields }
}
```

- [ ] **Step 4: 创建 dmabuf-dump 解析器**

```typescript
// server/parsers/dmabuf-dump.ts

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

export function parseDmabufDump(stdout: string, pid: number): ParsedDmabufDump {
  if (/dmabuf info not found/i.test(stdout)) {
    return { pid, totalKb: 0, groups: [] }
  }

  const re = /^\s*(.+?)\s+(\d+)\s+kB\s+(\d+)\s+kB\s+(\d+)\s+(\d+)\s+(\S+)\s*$/
  const bySize = new Map<number, DmabufGroup>()
  let totalKb = 0

  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(re)
    if (!m) continue
    const rss = Number(m[2])
    if (rss === 0) continue
    totalKb += rss
    const g = bySize.get(rss)
    if (g) {
      g.count += 1
      g.totalKb += rss
    } else {
      bySize.set(rss, { sizeKb: rss, count: 1, totalKb: rss })
    }
  }

  const groups = Array.from(bySize.values()).sort((a, b) => b.totalKb - a.totalKb)
  return { pid, totalKb, groups }
}
```

- [ ] **Step 5: 创建 showmap 解析器**

```typescript
// server/parsers/showmap.ts

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

export function parseShowmap(stdout: string, pid: number): ParsedShowmap {
  const mappings: ShowmapMapping[] = []

  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const tokens = line.trim().split(/\s+/)
    let i = 0
    while (i < tokens.length && /^\d+$/.test(tokens[i])) i++
    if (i < 7) continue
    const nums = tokens.slice(0, i).map(Number)
    let objStr = tokens.slice(i).join(' ').trim()

    const std = objStr.match(/^[0-9a-fA-F]+-[0-9a-fA-F]+\s+\S+\s+\S+\s+\S+\s+\S+\s?(.*)$/)
    if (std) objStr = std[1].trim()

    if (objStr === 'TOTAL') continue

    const vss = nums[0]
    const rss = nums[1]
    const pss = nums[2]
    const dirty = (nums[4] ?? 0) + (nums[6] ?? 0)

    mappings.push({ name: objStr, vss, rss, pss, dirty })
  }

  mappings.sort((a, b) => b.pss - a.pss)
  return { pid, mappings: mappings.slice(0, 30) }
}
```

- [ ] **Step 6: 验证解析器**

```bash
npm run server:build
```

- [ ] **Step 7: Commit**

```bash
git add server/parsers/
git commit -m "feat: add memory data parsers (dumpsys, meminfo-ion, meminfo, dmabuf-dump, showmap)"
```

---

## Task 3: 后端路由与服务

**Covers:** API 端点

**Files:**
- Create: `server/routes/memory.ts`
- Create: `server/services/memory-poller.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: 解析器函数
- Produces: REST API + WebSocket 端点

- [ ] **Step 1: 创建内存轮询服务**

```typescript
// server/services/memory-poller.ts

import { spawn } from 'child_process'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'
import { parseDumpsysMeminfo } from '../parsers/dumpsys-meminfo.js'
import { parseMeminfoIon } from '../parsers/meminfo-ion.js'
import { parseMeminfo } from '../parsers/meminfo.js'
import type { WebSocket } from 'ws'

const log = logger.child({ module: 'memory-poller' })

interface MonitoredProc {
  name: string
  pid: number | null
  dynamic: boolean
  needsResolve: boolean
  peakIonKb: number
}

interface PollerOptions {
  intervalMs: number
  procs: { name: string; pid: number | null; dynamic: boolean }[]
  showSystemMem: boolean
  serial: string
}

function execAdb(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const adbPath = config.adb.path
    const proc = spawn(adbPath, args, { shell: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(stderr || `adb exited with code ${code}`))
    })
    proc.on('error', reject)
  })
}

function shell(serial: string, cmd: string): Promise<string> {
  return execAdb(['-s', serial, 'shell', cmd])
}

function pidOfFast(serial: string, name: string): Promise<number | null> {
  if (!/^[A-Za-z0-9._@-]+$/.test(name)) return Promise.resolve(null)
  return shell(serial, `pidof ${name}`)
    .then((out) => {
      const pid = out.trim().split(/\s+/)[0]
      return pid && /^\d+$/.test(pid) ? Number(pid) : null
    })
    .catch(() => null)
}

function zeroDumpsys() {
  return {
    pid: 0, totalPss: 0, eglMtrackPss: 0, pssNoEgl: 0,
    totalRss: 0, totalPrivateDirty: 0, totalPrivateClean: 0,
    totalSwapPss: 0, categories: []
  }
}

export class MemoryPoller {
  private monitored: MonitoredProc[] = []
  private showSystemMem = false
  private intervalMs = 1000
  private timer: NodeJS.Timeout | null = null
  private serial = ''
  private ws: WebSocket | null = null

  constructor(private send: (data: any) => void) {}

  start(opts: PollerOptions) {
    this.stop()
    this.serial = opts.serial
    this.intervalMs = opts.intervalMs
    this.showSystemMem = opts.showSystemMem
    this.monitored = opts.procs.map((p) => ({
      name: p.name,
      pid: p.pid,
      dynamic: p.dynamic,
      needsResolve: true,
      peakIonKb: 0,
    }))
    void this.tick()
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  setShowSystemMem(b: boolean) {
    this.showSystemMem = b
  }

  private async tick() {
    const start = Date.now()
    await this.captureTick()
    const delay = Math.max(0, this.intervalMs - (Date.now() - start))
    this.timer = setTimeout(() => void this.tick(), delay)
  }

  private async captureTick() {
    const ts = Date.now()
    const samples: any[] = []
    const tasks: Promise<void>[] = []

    // PID 解析
    await Promise.all(
      this.monitored.map(async (p) => {
        if (p.dynamic || p.needsResolve) {
          p.pid = await pidOfFast(this.serial, p.name)
          p.needsResolve = false
        }
      })
    )

    // ion 分配量
    let ionMap = new Map<number, number>()
    tasks.push(
      shell(this.serial, 'cat /proc/meminfo_ion')
        .then((out) => { ionMap = parseMeminfoIon(out) })
        .catch((e) => this.send({ type: 'error', kind: 'dmabuf', message: e.message }))
    )

    // dumpsys meminfo
    for (const p of this.monitored) {
      if (p.pid != null) {
        tasks.push(
          shell(this.serial, `dumpsys meminfo ${p.pid}`)
            .then((out) => {
              const parsed = parseDumpsysMeminfo(out)
              if (!p.dynamic && parsed.categories.length === 0) {
                p.pid = null
                p.needsResolve = true
                samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
              } else {
                samples.push({ kind: 'dumpsys', name: p.name, pid: p.pid, timestamp: ts, data: parsed })
              }
            })
            .catch((e) => this.send({ type: 'error', kind: 'dumpsys', message: e.message }))
        )
      } else {
        samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
      }
    }

    // 整机 meminfo
    if (this.showSystemMem) {
      tasks.push(
        shell(this.serial, 'cat /proc/meminfo')
          .then((out) => samples.push({ kind: 'meminfo', name: null, pid: null, timestamp: ts, data: parseMeminfo(out) }))
          .catch((e) => this.send({ type: 'error', kind: 'meminfo', message: e.message }))
      )
    }

    await Promise.all(tasks)

    // 分发 ion 量
    for (const p of this.monitored) {
      const ionKb = p.pid != null ? ionMap.get(p.pid) ?? 0 : 0
      samples.push({ kind: 'dmabuf', name: p.name, pid: p.pid, timestamp: ts, data: { pid: p.pid ?? 0, ionKb } })
      if (p.pid != null && ionKb > p.peakIonKb) p.peakIonKb = ionKb
    }

    if (samples.length > 0) {
      this.send({ type: 'samples', samples })
    }
  }
}
```

- [ ] **Step 2: 创建内存分析路由**

```typescript
// server/routes/memory.ts

import { Router } from 'express'
import { exec } from 'child_process'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'
import { parseShowmap } from '../parsers/showmap.js'
import { parseDmabufDump } from '../parsers/dmabuf-dump.js'

const log = logger.child({ module: 'memory-routes' })
const router = Router()

function execAdb(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const adbPath = config.adb.path
    exec(`"${adbPath}" ${args.join(' ')}`, { maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message))
      else resolve(stdout)
    })
  })
}

function shell(serial: string, cmd: string): Promise<string> {
  return execAdb(['-s', serial, 'shell', cmd])
}

// 检测 root
router.get('/is-root/:serial', async (req, res) => {
  try {
    const out = await shell(req.params.serial, 'id')
    res.json({ root: /uid=0\(root\)/.test(out) })
  } catch (e) {
    res.json({ root: false })
  }
})

// 获取进程 PID
router.get('/pid/:serial/:name', async (req, res) => {
  const { serial, name } = req.params
  if (!/^[A-Za-z0-9._@-]+$/.test(name)) {
    return res.json({ pid: null })
  }
  try {
    const out = await shell(serial, `pidof ${name}`)
    const pid = out.trim().split(/\s+/)[0]
    res.json({ pid: pid && /^\d+$/.test(pid) ? Number(pid) : null })
  } catch {
    res.json({ pid: null })
  }
})

// 批量刷新 PID
router.post('/pids/:serial', async (req, res) => {
  const { serial } = req.params
  const { names } = req.body as { names: string[] }
  const results: Record<string, number | null> = {}
  
  await Promise.all(
    names.map(async (name) => {
      if (!/^[A-Za-z0-9._@-]+$/.test(name)) {
        results[name] = null
        return
      }
      try {
        const out = await shell(serial, `pidof ${name}`)
        const pid = out.trim().split(/\s+/)[0]
        results[name] = pid && /^\d+$/.test(pid) ? Number(pid) : null
      } catch {
        results[name] = null
      }
    })
  )
  
  res.json(results)
})

// showmap
router.get('/showmap/:serial/:pid', async (req, res) => {
  try {
    const out = await shell(req.params.serial, `showmap ${req.params.pid}`)
    res.json({ ok: true, data: parseShowmap(out, Number(req.params.pid)) })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
  }
})

// dmabuf_dump
router.get('/dmabuf-dump/:serial/:pid', async (req, res) => {
  try {
    const out = await shell(req.params.serial, `dmabuf_dump ${req.params.pid}`)
    res.json({ ok: true, data: parseDmabufDump(out, Number(req.params.pid)) })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
  }
})

export default router
```

- [ ] **Step 3: 注册路由到 Express**

修改 `server/index.ts`，添加内存分析路由。

- [ ] **Step 4: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/memory.ts server/services/memory-poller.ts server/index.ts
git commit -m "feat: add memory analysis backend routes and poller service"
```

---

## Task 4: WebSocket 端点

**Covers:** 实时数据推送

**Files:**
- Create: `server/services/memory-ws.ts`
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: `MemoryPoller`
- Produces: WebSocket `/memory` 端点

- [ ] **Step 1: 创建 WebSocket 服务**

```typescript
// server/services/memory-ws.ts

import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { logger } from '../utils/logger.js'
import { MemoryPoller } from './memory-poller.js'

const log = logger.child({ module: 'memory-ws' })

export function setupMemoryWss(server: Server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`)
    if (url.pathname === '/memory') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', (ws) => {
    log.info('Memory WebSocket connected')
    
    const poller = new MemoryPoller((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
      }
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'start':
            poller.start(msg.opts)
            break
          case 'stop':
            poller.stop()
            break
          case 'set-show-system-mem':
            poller.setShowSystemMem(msg.b)
            break
        }
      } catch (e) {
        log.error({ error: (e as Error).message }, 'Failed to parse message')
      }
    })

    ws.on('close', () => {
      log.info('Memory WebSocket disconnected')
      poller.stop()
    })

    ws.on('error', (err) => {
      log.error({ error: err.message }, 'Memory WebSocket error')
      poller.stop()
    })
  })

  log.info('Memory WebSocket server ready on /memory')
  return wss
}
```

- [ ] **Step 2: 注册 WebSocket 端点**

修改 `server/index.ts`，调用 `setupMemoryWss(server)`。

- [ ] **Step 3: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 4: Commit**

```bash
git add server/services/memory-ws.ts server/index.ts
git commit -m "feat: add WebSocket endpoint for real-time memory data"
```

---

## Task 5: 前端导航与路由

**Covers:** 页面入口

**Files:**
- Modify: `src/config/navigation.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `/memory` 路由

- [ ] **Step 1: 添加导航项**

修改 `src/config/navigation.tsx`，添加内存分析导航项。

- [ ] **Step 2: 添加路由**

修改 `src/App.tsx`，添加内存分析页面路由。

- [ ] **Step 3: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 4: Commit**

```bash
git add src/config/navigation.tsx src/App.tsx
git commit -m "feat: add memory analysis navigation and route"
```

---

## Task 6: 设备选择页面

**Covers:** 设备选择 UI

**Files:**
- Create: `src/pages/memory/DeviceSelect.tsx`

**Interfaces:**
- Consumes: Redux `memory` slice
- Produces: 设备选择 UI

- [ ] **Step 1: 创建设备选择组件**

创建 `src/pages/memory/DeviceSelect.tsx`，实现：
- ADB 环境检查
- 设备列表展示
- 设备选择与进入

- [ ] **Step 2: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/memory/DeviceSelect.tsx
git commit -m "feat: add memory analysis device selection page"
```

---

## Task 7: 进程管理页面

**Covers:** 进程管理 UI

**Files:**
- Create: `src/pages/memory/ProcessManager.tsx`

**Interfaces:**
- Consumes: Redux `memory` slice
- Produces: 进程管理 UI

- [ ] **Step 1: 创建进程管理组件**

创建 `src/pages/memory/ProcessManager.tsx`，实现：
- 进程列表展示（19 个预置进程）
- 进程选择
- 自定义进程增删

- [ ] **Step 2: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/memory/ProcessManager.tsx
git commit -m "feat: add memory analysis process manager page"
```

---

## Task 8: 抓取面板页面

**Covers:** 实时监控 UI

**Files:**
- Create: `src/pages/memory/Dashboard.tsx`
- Create: `src/components/memory/TrendChart.tsx`
- Create: `src/components/memory/MiniList.tsx`
- Create: `src/components/memory/ProcessCard.tsx`

**Interfaces:**
- Consumes: Redux `memory` slice, WebSocket
- Produces: 抓取面板 UI

- [ ] **Step 1: 创建趋势图组件**

创建 `src/components/memory/TrendChart.tsx`，使用 ECharts 实现趋势折线图。

- [ ] **Step 2: 创建数值列表组件**

创建 `src/components/memory/MiniList.tsx`，展示最近 10 个采样值。

- [ ] **Step 3: 创建进程卡片组件**

创建 `src/components/memory/ProcessCard.tsx`，展示单个进程的内存数据。

- [ ] **Step 4: 创建抓取面板**

创建 `src/pages/memory/Dashboard.tsx`，实现：
- 工具栏（开始/停止、间隔设置、导出）
- 进程卡片列表
- 总内存趋势图

- [ ] **Step 5: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/memory/Dashboard.tsx src/components/memory/
git commit -m "feat: add memory analysis dashboard with trend charts"
```

---

## Task 9: 详情页面

**Covers:** 详情分析 UI

**Files:**
- Create: `src/pages/memory/DetailPage.tsx`
- Create: `src/pages/memory/DmabufDetailPage.tsx`

**Interfaces:**
- Consumes: Redux `memory` slice
- Produces: 详情页 UI

- [ ] **Step 1: 创建 meminfo 详情页**

创建 `src/pages/memory/DetailPage.tsx`，实现：
- PSS 趋势图
- 内存分类拆解表（dumpsys meminfo）
- 映射明细表（showmap）

- [ ] **Step 2: 创建 dmabuf 详情页**

创建 `src/pages/memory/DmabufDetailPage.tsx`，实现：
- ion 趋势图
- 缓冲区明细表（dmabuf_dump）

- [ ] **Step 3: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/memory/DetailPage.tsx src/pages/memory/DmabufDetailPage.tsx
git commit -m "feat: add memory analysis detail pages (meminfo and dmabuf)"
```

---

## Task 10: 主页面集成

**Covers:** 页面组合

**Files:**
- Create: `src/pages/MemoryAnalysis.tsx`

**Interfaces:**
- Consumes: Redux `memory` slice
- Produces: 主页面组件

- [ ] **Step 1: 创建主页面**

创建 `src/pages/MemoryAnalysis.tsx`，根据 `stage` 状态切换子页面。

- [ ] **Step 2: 更新路由**

修改 `src/App.tsx`，使用 `MemoryAnalysis` 作为内存分析页面。

- [ ] **Step 3: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/MemoryAnalysis.tsx src/App.tsx
git commit -m "feat: integrate memory analysis main page with stage routing"
```

---

## Task 11: 数据导出功能

**Covers:** xlsx 导出

**Files:**
- Modify: `server/routes/memory.ts`
- Modify: `src/pages/memory/Dashboard.tsx`

**Interfaces:**
- Consumes: Redux store 数据
- Produces: xlsx 文件

- [ ] **Step 1: 添加导出 API**

修改 `server/routes/memory.ts`，添加 xlsx 导出端点。

- [ ] **Step 2: 添加导出按钮**

修改 `src/pages/memory/Dashboard.tsx`，添加导出功能。

- [ ] **Step 3: 验证构建**

```bash
npm run web:build
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/memory.ts src/pages/memory/Dashboard.tsx
git commit -m "feat: add memory data export to xlsx"
```

---

## Task 12: 测试与验证

**Covers:** 功能验证

**Files:**
- Create: `server/parsers/*.test.ts`
- Create: `src/store/memory.test.ts`

**Interfaces:**
- 验证所有解析器和状态管理

- [ ] **Step 1: 编写解析器测试**

为每个解析器编写单元测试。

- [ ] **Step 2: 编写 Redux 测试**

为 memory slice 编写测试。

- [ ] **Step 3: 运行所有测试**

```bash
npm run test:all
```

- [ ] **Step 4: 完整构建验证**

```bash
npm run web:build
```

- [ ] **Step 5: Commit**

```bash
git add server/parsers/*.test.ts src/store/memory.test.ts
git commit -m "test: add memory analysis parser and store tests"
```

---

## 执行说明

本计划包含 12 个任务，建议按顺序执行。每个任务都包含：
1. 创建/修改文件
2. 验证构建
3. 提交代码

完成后，内存分析功能将完全集成到 TsCameraTools 项目中。
