import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { getAdbPath, getSerial } from './adb'
import type { Sample, CommandKind, ParsedDmabufDump } from '../shared/types'

/**
 * 抓取轮询 facade：实际 adb 工作跑在 worker 线程（见 poller-worker.ts），本文件只负责
 * 生命周期管理 + 消息转发。主进程事件循环不再被 adb spawn/解析阻塞 → JS 拖动 setPosition
 * 稳定 16ms + 数据 tick 节拍均匀。
 *
 * 保留与原轮询模块完全相同的外部 API（startPoller/stopPoller/isPolling/setShowSystemMem），
 * ipc.ts 无需改动。worker 文件由 electron.vite.config.ts 作为第二个 main 入口产出，
 * 与 index.js 同目录（out/main/poller-worker.js），运行时用 __dirname 定位。
 */

/** 一轮 tick 的全部样本批量推送（保证 meminfo/dmabuf 同一帧到达，前端左右栏同步） */
export type OnSamples = (samples: Sample[]) => void
export type OnError = (kind: CommandKind, err: Error) => void
/** worker 在 ionKb 新峰值时抓取的 dmabuf_dump 明细（null=命中峰值但无数据） */
export type OnPeak = (name: string, breakdown: ParsedDmabufDump | null) => void

interface PollerOpts {
  intervalMs: number
  procs: { name: string; pid: number | null; dynamic: boolean }[]
  showSystemMem: boolean
  onSamples: OnSamples
  onError: OnError
  onPeak: OnPeak
}

let worker: Worker | null = null
let running = false
/** 代次：start/stop 自增。worker terminate 是异步的，用 epoch 丢弃 terminate 前已入队的旧消息 */
let epoch = 0

/** 启动轮询：创建 worker 并下发 start（携带 adbPath + serial 注入 worker 独立模块实例） */
export function startPoller(opts: PollerOpts): void {
  stopPoller()
  running = true
  const myEpoch = ++epoch
  worker = new Worker(join(__dirname, 'poller-worker.js'))
  worker.on(
    'message',
    (m: { type: string; samples?: Sample[]; kind?: CommandKind; message?: string; name?: string; breakdown?: ParsedDmabufDump | null }) => {
      // terminate 异步：丢弃来自上一轮 worker 的迟到消息
      if (myEpoch !== epoch) return
      if (m.type === 'samples' && m.samples) opts.onSamples(m.samples)
      else if (m.type === 'error' && m.kind && m.message) opts.onError(m.kind, new Error(m.message))
      else if (m.type === 'peak' && m.name) opts.onPeak(m.name, m.breakdown ?? null)
    }
  )
  worker.on('error', (e) => {
    if (myEpoch !== epoch) return
    opts.onError('dumpsys', e)
  })
  worker.postMessage({
    type: 'start',
    intervalMs: opts.intervalMs,
    procs: opts.procs,
    showSystemMem: opts.showSystemMem,
    adbPath: getAdbPath(),
    serial: getSerial()
  })
}

/** 停止轮询：terminate worker（强杀，可靠；adb 子命令极短，残留可忽略） */
export function stopPoller(): void {
  running = false
  epoch++
  if (worker) {
    const w = worker
    worker = null
    void w.terminate()
  }
}

export function isPolling(): boolean {
  return running
}

/** 轮询中切换是否抓取整机 /proc/meminfo（转发给 worker） */
export function setShowSystemMem(b: boolean): void {
  worker?.postMessage({ type: 'set-show-system-mem', b })
}
