import { create } from 'zustand'
import type {
  DeviceInfo,
  ProcessStatus,
  Sample,
  ParsedDumpsys,
  ParsedMeminfo,
  DmabufPoint,
  ParsedDmabufDump
} from '@shared/types'

type Stage = 'device' | 'process' | 'dashboard' | 'detail' | 'dmabuf-detail'

/** 每个 pid / 系统级各保留最近 N 个采样（对应「最多同时显示 10 个数据」） */
const MAX_PER_PID = 10

/** 带时间戳的采样（供折线图 X 轴） */
interface Timed<T> {
  ts: number
  data: T
}

interface State {
  stage: Stage
  serial: string | null
  device: DeviceInfo | null
  isRoot: boolean

  processes: ProcessStatus[]
  /** 多选的监控进程名列表 */
  selectedNames: string[]

  polling: boolean
  intervalMs: number
  /** 是否抓取并展示整机 /proc/meminfo */
  showSystemMem: boolean
  /** 抓取错误信息（设备掉线/命令失败时回显，成功后清除） */
  errorMessage: string | null

  /** 每进程 dumpsys meminfo 历史（按进程名键控，跨重启稳定） */
  dumpsysByName: Record<string, Timed<ParsedDumpsys>[]>
  /** 每进程 dmabuf PROCESS TOTAL 历史（按进程名键控） */
  dmabufByName: Record<string, Timed<DmabufPoint>[]>
  /** 每进程当前 PID（取自轮询 pidOfFast，非 dumpsys 解析——native 进程 dumpsys 无 pid 行） */
  pidByName: Record<string, number | null>
  /** 整机 /proc/meminfo 历史（带 ts，供导出时间轴） */
  systemMem: Timed<ParsedMeminfo>[]

  /** meminfo 峰值快照（按进程名键控）：totalPss 创新高时刻的完整 ParsedDumpsys。
   *  渲染层免费跟踪（pushSamples 已有完整 dumpsys），仅新峰值重赋引用（保 Zustand 稳定 ref）。
   *  键缺失 = 本轮抓取尚无样本（详情页峰值态显示「暂无峰值」）。 */
  peakDumpsys: Record<string, { ts: number; data: ParsedDumpsys }>
  /** dmabuf 峰值标量（按进程名键控）：ionKb 创新高时刻的 {ts, ionKb}，渲染层免费跟踪。 */
  peakDmabuf: Record<string, { ts: number; ionKb: number }>
  /** dmabuf 峰值明细（按进程名键控，由 worker 在 ionKb 新峰值时真实抓取 dmabuf_dump 推送）。
   *  值含义：缺失=尚未命中峰值/未抓；null=命中峰值但 dmabuf_dump 无数据（分配者不持有 fd）；
   *  对象=峰值时刻的 buffer 分组明细。 */
  peakDmabufBreakdown: Record<string, ParsedDmabufDump | null>

  /** 详情页目标进程 */
  detailPid: number | null
  detailName: string | null

  // actions
  setStage: (s: Stage) => void
  setDevice: (d: DeviceInfo | null) => void
  setRoot: (r: boolean) => void
  setProcesses: (p: ProcessStatus[]) => void
  setSelected: (names: string[]) => void
  setPolling: (b: boolean) => void
  setInterval: (ms: number) => void
  setShowSystemMem: (b: boolean) => void
  setDetail: (pid: number | null, name: string | null) => void
  /** 批量应用一轮 tick 的样本（单次 set，前端一次性刷新，左右栏同步） */
  pushSamples: (samples: Sample[]) => void
  /** worker 推送的 dmabuf 峰值明细（ionKb 新峰值时真实抓取 dmabuf_dump 的结果） */
  setPeakDmabufBreakdown: (name: string, breakdown: ParsedDmabufDump | null) => void
  setError: (msg: string | null) => void
  clearCapture: () => void
}

export const useStore = create<State>((set) => ({
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

  setStage: (s) => set({ stage: s }),
  setDevice: (d) => set({ device: d, serial: d?.serial ?? null }),
  setRoot: (r) => set({ isRoot: r }),
  setProcesses: (p) => set({ processes: p }),
  setSelected: (names) => set({ selectedNames: names }),
  setPolling: (b) => set({ polling: b }),
  setInterval: (ms) => set({ intervalMs: ms }),
  setShowSystemMem: (b) => set({ showSystemMem: b }),
  setDetail: (pid, name) => set({ detailPid: pid, detailName: name }),
  setError: (msg) => set({ errorMessage: msg }),

  // 批量应用一轮 tick 的样本：按 kind + name 路由，每进程/系统各保留最近 MAX_PER_PID 条。
  // 关键：在局部变量上累积，最后一次 set 返回含全部字段的 partial——
  // 切勿像旧实现那样 `next = applySample(next, s)` 链式覆盖（会把整个 store 擦成单字段）。
  // pidByName 取自 sample.pid（pidOfFast 结果），而非 dumpsys 解析的 data.pid——
  // native HAL 进程的 dumpsys 输出无「MEMINFO in pid」行，data.pid 恒为 0，不可靠。
  // 峰值跟踪：dumpsys 比 totalPss、dmabuf 比 ionKb，创新高才整体快照（仅新峰值重赋对应 key 引用，
  // 不渗进 dumpsysByName/dmabufByName，保 ProcessCard memo 稳定 ref，避免 9 卡每 tick 全量重算）。
  pushSamples: (samples) =>
    set((st) => {
      let dumpsysByName = st.dumpsysByName
      let dmabufByName = st.dmabufByName
      let pidByName = st.pidByName
      let systemMem = st.systemMem
      let peakDumpsys = st.peakDumpsys
      let peakDmabuf = st.peakDmabuf
      for (const s of samples) {
        if (s.kind === 'dumpsys' && s.name != null) {
          const d = s.data as ParsedDumpsys
          const arr = [...(dumpsysByName[s.name] ?? []), { ts: s.timestamp, data: d }].slice(-MAX_PER_PID)
          dumpsysByName = { ...dumpsysByName, [s.name]: arr }
          pidByName = { ...pidByName, [s.name]: s.pid }
          if (d.totalPss > (peakDumpsys[s.name]?.data.totalPss ?? -1)) {
            peakDumpsys = { ...peakDumpsys, [s.name]: { ts: s.timestamp, data: d } }
          }
        } else if (s.kind === 'dmabuf' && s.name != null) {
          const d = s.data as DmabufPoint
          const arr = [...(dmabufByName[s.name] ?? []), { ts: s.timestamp, data: d }].slice(-MAX_PER_PID)
          dmabufByName = { ...dmabufByName, [s.name]: arr }
          if (d.ionKb > (peakDmabuf[s.name]?.ionKb ?? -1)) {
            peakDmabuf = { ...peakDmabuf, [s.name]: { ts: s.timestamp, ionKb: d.ionKb } }
          }
        } else if (s.kind === 'meminfo') {
          systemMem = [...systemMem, { ts: s.timestamp, data: s.data as ParsedMeminfo }].slice(-MAX_PER_PID)
        }
      }
      return { dumpsysByName, dmabufByName, pidByName, systemMem, peakDumpsys, peakDmabuf }
    }),

  setPeakDmabufBreakdown: (name, breakdown) =>
    set((st) => ({ peakDmabufBreakdown: { ...st.peakDmabufBreakdown, [name]: breakdown } })),

  // 每次开始抓取 / 清空历史时重置峰值（onStart 已调本 action），含 worker 推送的明细
  clearCapture: () =>
    set({ dumpsysByName: {}, dmabufByName: {}, pidByName: {}, systemMem: [], peakDumpsys: {}, peakDmabuf: {}, peakDmabufBreakdown: {}, errorMessage: null })
}))
