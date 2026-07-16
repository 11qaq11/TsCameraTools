import { spawn } from 'child_process'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'
import { parseDumpsysMeminfo } from '../parsers/dumpsys-meminfo.js'
import { parseMeminfoIon } from '../parsers/meminfo-ion.js'
import { parseMeminfo } from '../parsers/meminfo.js'

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
    log.info({ serial: this.serial, intervalMs: this.intervalMs, procCount: this.monitored.length }, 'Poller started')
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
          .then((out) => { samples.push({ kind: 'meminfo', name: null, pid: null, timestamp: ts, data: parseMeminfo(out) }) })
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
