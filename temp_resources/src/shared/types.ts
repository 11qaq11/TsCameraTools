// 主进程与渲染进程共享的类型定义

/** 进程分类（仅用于 UI 排序/分组，不参与抓取逻辑） */
export type ProcessCategory = 'app' | 'service' | 'provider' | 'allocator' | 'algo' | 'kernel'

/** 一条已配置的待监控进程 */
export interface ProcessEntry {
  /** 进程名，如 com.android.systemui（用于 pidof 取 PID） */
  name: string
  /** 缩略名（展示用，如 CAMERA3D；为空时回退显示 name） */
  alias?: string
  /** 备注（可选） */
  note?: string
  /**
   * PID 是否动态变化（参考 camera-memory-fetcher proclist 的 `?` 后缀）。
   * true=每 tick 重解 PID（APP/GALLERY 等会启停的进程）；false=解析一次后缓存（boot 服务）。
   * 缺省按 true（与历史行为一致，迁移/用户自增条目安全）。
   */
  dynamic?: boolean
  /** 分类（可选，仅 UI 排序用） */
  category?: ProcessCategory
}

/** 运行时进程状态（配置 + 实时 PID） */
export interface ProcessStatus extends ProcessEntry {
  /** pidof 解析到的 PID；未运行时为 null */
  pid: number | null
  /** 运行状态 */
  running: boolean
}

/** adb devices -l 解析结果 */
export interface DeviceInfo {
  serial: string
  state: string // device / unauthorized / offline
  model?: string
  product?: string
}

/** adb 环境检查结果 */
export interface AdbEnvCheck {
  ok: boolean
  adbPath?: string
  version?: string
  reason?: string
}

/** USB 驱动检查结果 */
export interface UsbDriverCheck {
  ok: boolean
  reason?: string
}

/** 命令种类 */
export type CommandKind = 'meminfo' | 'dmabuf' | 'dumpsys' | 'showmap'

/** 一条抓取样本（主进程推送至渲染层） */
export interface Sample {
  kind: CommandKind
  /** 该样本归属的进程名（按名键控，跨重启稳定；系统级 meminfo 为 null） */
  name: string | null
  /** 该样本归属的 PID（进程未运行时为 null；系统级命令为 null） */
  pid: number | null
  timestamp: number
  /** 解析后的结构化数据，不同 kind 结构不同 */
  data: ParsedMeminfo | ParsedDumpsys | DmabufPoint | ParsedShowmap
}

/** /proc/meminfo 解析：键 -> KB */
export interface ParsedMeminfo {
  fields: Record<string, number>
}

/** dumpsys meminfo <pid> 解析 */
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
  /** dumpsys TOTAL PSS（原始，含 EGL/GL mtrack，与 categories 各项之和一致；DetailPage 分类表用） */
  totalPss: number
  /** EGL mtrack 行 PSS（图形 dma-buf 映射，由 gralloc 分配）；cmf 口径需从 totalPss 减去，
   *  避免与 meminfo_ion 的图形 ion 计费重复（cmf AdbClientExtension: TOTAL − EGL mtrack） */
  eglMtrackPss: number
  /** cmf 口径 PSS = totalPss − eglMtrackPss（趋势/合计/导出用，对齐 camera-memory-fetcher） */
  pssNoEgl: number
  totalRss: number
  /** TOTAL 行完整字段（含 mtrack，与顶部 PSS 趋势同口径） */
  totalPrivateDirty: number
  totalPrivateClean: number
  totalSwapPss: number
  categories: DumpsysCategory[]
}

/** 单进程 ion 采样点（由 /proc/meminfo_ion 按 pid 提取，分配者计费口径，对齐 cmf） */
export interface DmabufPoint {
  pid: number
  /** 该进程 ion_alloc 的 buffer 总量（KB）；不分配的进程（如 APP/CAMERA3D）为 0 */
  ionKb: number
}

/** dmabuf_dump <pid> 解析：按 Rss 尺寸分组的 buffer 占用（持有者视图，与 meminfo_ion 分配者口径不同） */
export interface DmabufGroup {
  /** 单个 buffer 占用（Rss，KB） */
  sizeKb: number
  /** 该尺寸 buffer 的数量 */
  count: number
  /** 该组总占用 = sizeKb × count（KB） */
  totalKb: number
}
export interface ParsedDmabufDump {
  pid: number
  /** 全部 buffer Rss 之和（KB，≈ PROCESS TOTAL Rss） */
  totalKb: number
  /** 按 totalKb 降序的尺寸分组（渲染层取 Top10 + 补齐 10 行） */
  groups: DmabufGroup[]
}

/** showmap <pid> 解析：明细映射（按 pss 降序 Top N） */
export interface ShowmapMapping {
  name: string
  vss: number
  rss: number
  pss: number
  dirty: number
}
export interface ParsedShowmap {
  pid: number
  /** 按 pss 降序的 Top N 映射明细 */
  mappings: ShowmapMapping[]
}

/** ===== xlsx 导出载荷（渲染层从 store 提取精简数值后传给主进程，避免传整个解析对象） ===== */
export interface ExportProc {
  name: string
  alias?: string
}
export interface ExportDumpsysPoint {
  ts: number
  /** cmf 口径 PSS（totalPss − EGL mtrack），与 Dashboard 趋势/合计同口径 */
  pss: number
  rss: number
  /** EGL mtrack PSS（明细，可还原原始 totalPss = pss + eglMtrackPss） */
  eglMtrackPss: number
}
export interface ExportDmabufPoint {
  ts: number
  /** 进程 ion_alloc 总量（KB，分配者口径）；不分配的进程为 0 */
  ionKb: number
}
export interface ExportSystemMemPoint {
  ts: number
  fields: Record<string, number>
}
export interface ExportPayload {
  /** 选中的进程（含展示别名） */
  procs: ExportProc[]
  /** 每进程 dumpsys meminfo 历史（PSS(减EGL) / EGL mtrack / RSS，KB） */
  dumpsys: Record<string, ExportDumpsysPoint[]>
  /** 每进程 ion 分配量历史（KB，分配者口径） */
  dmabuf: Record<string, ExportDmabufPoint[]>
  /** 整机 /proc/meminfo 历史 */
  systemMem: ExportSystemMemPoint[]
  /** 抓取起始时间戳（用于生成默认文件名） */
  startedAt: number
}
