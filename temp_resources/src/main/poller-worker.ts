/**
 * 抓取轮询 worker：在独立线程跑 adb 命令 + 解析，避免阻塞主进程事件循环。
 *
 * 背景：trace 实测主进程每 tick 起 ~11-18 个 adb.exe（USB 串行 + Windows spawn 开销），
 * 形成最长 3079ms 的不透明阻塞任务，既拖乱数据 tick 节拍，又饿死同在主进程事件循环上的
 * JS 拖动 setPosition（16ms 轮询排不上 → 拖动卡顿）。把整条 tick 链移到 worker_threads：
 * 主进程只负责 IPC 转发 + 窗口控制，adb spawn/解析不再争抢主循环。
 *
 * worker 有独立的模块实例，必须由主进程在 'start' 时注入 adbPath + serial（setAdbPath/setSerial）。
 * 通信：parentPort 收 {type:'start'|'set-show-system-mem'}，发 {type:'samples'|'error'}。
 */
import { parentPort } from 'node:worker_threads'
import { setAdbPath, setSerial, shell, pidOfFast } from './adb'
import { parseMeminfo } from './parsers/meminfo'
import { parseMeminfoIon } from './parsers/meminfo-ion'
import { parseDumpsysMeminfo } from './parsers/dumpsys-meminfo'
import { parseDmabufDump } from './parsers/dmabuf-dump'
import type { Sample, CommandKind, DmabufPoint, ParsedDumpsys, ParsedDmabufDump } from '../shared/types'

interface MonitoredProc {
  name: string
  pid: number | null
  dynamic: boolean
  needsResolve: boolean
  /** 本轮抓取该进程 ionKb 的历史峰值（startPoller 重建即重置）。仅创新高时触发 dmabuf_dump 抓峰值明细 */
  peakIonKb: number
  /** 是否有 dmabuf_dump 在途（去重：每进程至多 1 个并发抓取，避免上升期密集调用） */
  dmabufInflight: boolean
  /** 当前在途抓取所对应的 ionKb（0=无在途）。resolve 后若 peakIonKb 已升高则补抓，否则稳态峰值漏抓 */
  inflightIonKb: number
}

interface StartOpts {
  intervalMs: number
  procs: { name: string; pid: number | null; dynamic: boolean }[]
  showSystemMem: boolean
  adbPath: string
  serial: string | null
}

type Msg = (StartOpts & { type: 'start' }) | { type: 'set-show-system-mem'; b: boolean }

let monitored: MonitoredProc[] = []
let showSystemMemRef = false
let intervalMs = 1000
let timer: NodeJS.Timeout | null = null

function post(
  msg:
    | { type: 'samples'; samples: Sample[] }
    | { type: 'error'; kind: CommandKind; message: string }
    | { type: 'peak'; name: string; breakdown: ParsedDmabufDump | null }
): void {
  parentPort?.postMessage(msg)
}

/** 进程未运行时的 0 值 dumpsys（趋势显示 0，与运行时同结构） */
function zeroDumpsys(): ParsedDumpsys {
  return {
    pid: 0,
    totalPss: 0,
    eglMtrackPss: 0,
    pssNoEgl: 0,
    totalRss: 0,
    totalPrivateDirty: 0,
    totalPrivateClean: 0,
    totalSwapPss: 0,
    categories: []
  }
}

async function captureTick(): Promise<void> {
  const ts = Date.now()
  const samples: Sample[] = []
  const tasks: Promise<void>[] = []

  // 0. PID 解析：动态每 tick 重解；静态仅 needsResolve 时解析（稳态 0 次 pidof，死亡检测命中后重解）
  await Promise.all(
    monitored.map(async (p) => {
      if (p.dynamic || p.needsResolve) {
        p.pid = await pidOfFast(p.name)
        p.needsResolve = false
      }
    })
  )

  // 1. ion 分配量：cat /proc/meminfo_ion 一次（全局，分配者计费口径，对齐 cmf），与 dumpsys 并发
  let ionMap: Map<number, number> = new Map()
  tasks.push(
    (async () => {
      try {
        ionMap = parseMeminfoIon(await shell('cat /proc/meminfo_ion'))
      } catch (e) {
        post({ type: 'error', kind: 'dmabuf', message: (e as Error).message })
      }
    })()
  )

  // 2. 每个监控进程 dumpsys meminfo <pid>（与 dmabuf 并发）；未运行则填 0
  for (const p of monitored) {
    if (p.pid != null) {
      tasks.push(
        (async () => {
          try {
            const out = await shell(`dumpsys meminfo ${p.pid}`)
            const parsed = parseDumpsysMeminfo(out)
            // 死亡检测（静态缓存 pid 安全网）：死 PID 返回 "No process found"、exit=0 不抛错、
            // parseDumpsysMeminfo 得空 categories。命中则置 null + needsResolve，下轮重解；
            // 本帧推 pid:null 的 0 值，卡片立即转未运行（避免「运行中+0」假象）。
            if (!p.dynamic && parsed.categories.length === 0) {
              p.pid = null
              p.needsResolve = true
              samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
            } else {
              samples.push({ kind: 'dumpsys', name: p.name, pid: p.pid, timestamp: ts, data: parsed })
            }
          } catch (e) {
            post({ type: 'error', kind: 'dumpsys', message: (e as Error).message })
            if (!p.dynamic) {
              p.pid = null
              p.needsResolve = true
            }
          }
        })()
      )
    } else {
      samples.push({ kind: 'dumpsys', name: p.name, pid: null, timestamp: ts, data: zeroDumpsys() })
    }
  }

  // 3. 整机 /proc/meminfo（受开关控制，与上面并发）
  if (showSystemMemRef) {
    tasks.push(
      (async () => {
        try {
          const out = await shell('cat /proc/meminfo')
          samples.push({ kind: 'meminfo', name: null, pid: null, timestamp: ts, data: parseMeminfo(out) })
        } catch (e) {
          post({ type: 'error', kind: 'meminfo', message: (e as Error).message })
        }
      })()
    )
  }

  await Promise.all(tasks)
  // 按进程分发 ion 量（分配者口径）：未运行或未分配的进程 ionKb=0
  for (const p of monitored) {
    const ionKb = p.pid != null ? ionMap.get(p.pid) ?? 0 : 0
    const point: DmabufPoint = { pid: p.pid ?? 0, ionKb }
    samples.push({ kind: 'dmabuf', name: p.name, pid: p.pid, timestamp: ts, data: point })
    // dmabuf 峰值明细：ionKb 创新高时更新 peakIonKb；若无在途抓取且峰值高于在途 ionKb，异步 dmabuf_dump。
    // 仅 worker 能 adb 且不进主循环，不复发窗口拖动卡顿。in-flight 去重保证每进程≤1 并发；
    // inflightIonKb 保证上升期在途 resolve 后补抓真正峰值（否则稳态后 peakIonKb 已封顶、永不触发）。
    // 口径：dmabuf_dump 为持有者视图（Rss），与 ionKb 分配者口径不同，互补不互覆盖。
    if (p.pid != null && ionKb > p.peakIonKb) p.peakIonKb = ionKb
    if (p.pid != null && !p.dmabufInflight && p.peakIonKb > p.inflightIonKb) {
      p.dmabufInflight = true
      p.inflightIonKb = p.peakIonKb
      const name = p.name
      const pid = p.pid
      shell(`dmabuf_dump ${pid}`)
        .then((out) => parseDmabufDump(out, pid))
        .catch(() => null) // 命中峰值但抓取失败/无数据（分配者不持有 fd）→ null 语义
        .then((breakdown) => {
          p.dmabufInflight = false
          post({ type: 'peak', name, breakdown })
        })
    }
  }
  if (samples.length > 0) post({ type: 'samples', samples })
}

async function tick(): Promise<void> {
  const start = Date.now()
  await captureTick()
  // 固定节拍：下一轮在本轮「开始」后 intervalMs 触发。T<intervalMs 周期=intervalMs；
  // T≥intervalMs 立即续抓（绝不重叠），周期=T。避免「周期=T+intervalMs」累积漂移。
  // 停止靠主进程 worker.terminate()（瞬间杀线程），无需本侧 graceful stop。
  const delay = Math.max(0, intervalMs - (Date.now() - start))
  timer = setTimeout(() => void tick(), delay)
}

function start(opts: StartOpts): void {
  // worker 独立模块实例：注入 adbPath + serial，shell() 才能在本线程工作
  setAdbPath(opts.adbPath)
  setSerial(opts.serial)
  intervalMs = opts.intervalMs
  monitored = opts.procs.map((p) => ({
    name: p.name,
    pid: p.pid,
    dynamic: p.dynamic,
    needsResolve: true,
    peakIonKb: 0,
    dmabufInflight: false,
    inflightIonKb: 0
  }))
  showSystemMemRef = opts.showSystemMem
  void tick()
}

parentPort?.on('message', (msg: Msg) => {
  if (msg.type === 'start') {
    start(msg)
  } else if (msg.type === 'set-show-system-mem') {
    showSystemMemRef = msg.b
  }
})
