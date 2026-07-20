import { ipcMain, BrowserWindow, dialog, screen } from 'electron'
import ExcelJS from 'exceljs'
import { checkAdbEnv, checkUsbDriver, setAdbPath, setSerial, listDevices, pidOfFast, isShellRoot, shell } from './adb'
import { readProcesses, addProcess, removeProcess, resetProcesses } from './process-store'
import { startPoller, stopPoller, isPolling, setShowSystemMem } from './poller'
import { parseShowmap } from './parsers/showmap'
import { parseDmabufDump } from './parsers/dmabuf-dump'
import type { CommandKind, Sample, ProcessEntry, ProcessStatus, ExportPayload, ExportDumpsysPoint, ExportDmabufPoint } from '../shared/types'

let mainWindow: BrowserWindow | null = null
// 自定义拖动轮询定时器：主进程用 screen.getCursorScreenPoint 主动轮询鼠标位置驱动窗口移动
// （不依赖渲染 mousemove——窗口跟随会使鼠标相对窗口坐标不变、mousemove 不触发，拖动中断）。
let dragTimer: NodeJS.Timeout | null = null

/** 注入主窗口引用，用于推送 sample/error */
export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

function push(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload)
}

/** 注册所有 IPC 处理器 */
export function registerIpc(): void {
  // 启动期环境检查（adb + USB 驱动）。失败由调用方决定是否终止。
  ipcMain.handle('env:check', async () => {
    const adb = await checkAdbEnv()
    if (!adb.ok) return { adb, usb: { ok: false, reason: 'adb 不可用，跳过 USB 检测' } }
    setAdbPath(adb.adbPath!)
    const usb = await checkUsbDriver()
    return { adb, usb }
  })

  // 设备列表
  ipcMain.handle('adb:devices', async () => {
    try {
      return { ok: true, devices: await listDevices() }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // 锁定设备 serial
  ipcMain.handle('adb:set-serial', async (_e, serial: string | null) => {
    setSerial(serial)
    return { ok: true }
  })

  // 设备是否 root
  ipcMain.handle('adb:is-root', async () => ({ root: await isShellRoot() }))

  // 读取已配置进程列表
  ipcMain.handle('process:list', () => readProcesses())

  // 新增进程（dynamic 默认 true：用户自增进程可能启停，与历史「每 tick 重解」一致）
  ipcMain.handle('process:add', (_e, name: string, alias?: string, note?: string, dynamic?: boolean) => {
    try {
      return { ok: true, processes: addProcess(name, alias, note, dynamic) }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // 删除进程
  ipcMain.handle('process:remove', (_e, name: string) => {
    return { ok: true, processes: removeProcess(name) }
  })

  // 恢复默认进程列表（19 条 catalog，丢弃用户增删）
  ipcMain.handle('process:reset', () => {
    return { ok: true, processes: resetProcesses() }
  })

  // 刷新所有进程的实时 PID（保留 alias/note/dynamic/category 等字段，仅补 pid/running）。
  // 用 pidOfFast（仅 pidof，无 ps 回退）：catalog 名均精确，未运行条目不会各触发一次慢速 ps -A。
  ipcMain.handle('process:refresh-pids', async (_e, entries: ProcessEntry[]) => {
    const statuses: ProcessStatus[] = []
    for (const e of entries) {
      const pid = await pidOfFast(e.name)
      statuses.push({ ...e, pid, running: pid != null })
    }
    return statuses
  })

  // 启动抓取
  ipcMain.handle('capture:start', (_e, opts: { intervalMs: number; procs: { name: string; pid: number | null; dynamic: boolean }[]; showSystemMem: boolean }) => {
    if (isPolling()) return { ok: false, error: '已在抓取中' }
    startPoller({
      intervalMs: opts.intervalMs,
      procs: opts.procs,
      showSystemMem: opts.showSystemMem,
      // 批量推送：一轮 tick 的所有样本（同 ts 的 meminfo/dmabuf）一次性送达，前端左右栏同步
      onSamples: (samples: Sample[]) => push('capture:sample-batch', samples),
      onError: (kind: CommandKind, err: Error) => push('capture:error', { kind, message: err.message }),
      // worker 在 ionKb 新峰值时抓取的 dmabuf_dump 明细 → 推渲染层 setPeakDmabufBreakdown
      onPeak: (name: string, breakdown) => push('capture:peak', { name, breakdown })
    })
    return { ok: true }
  })

  // 轮询中切换是否抓取整机 /proc/meminfo
  ipcMain.handle('capture:set-show-system-mem', (_e, b: boolean) => {
    setShowSystemMem(b)
    return { ok: true }
  })

  // 一次性拉取 showmap <pid>（详情页按需调用，不进轮询循环）
  ipcMain.handle('capture:showmap-once', async (_e, pid: number) => {
    try {
      const out = await shell(`showmap ${pid}`)
      return { ok: true, data: parseShowmap(out, pid) }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // 一次性拉取 dmabuf_dump <pid>（dmabuf 详情页按需调用，不进轮询循环）
  // 口径：持有者视图（谁持有 fd），与轮询的 meminfo_ion 分配者口径不同，二者互补不互覆盖。
  ipcMain.handle('capture:dmabuf-dump-once', async (_e, pid: number) => {
    try {
      const out = await shell(`dmabuf_dump ${pid}`)
      return { ok: true, data: parseDmabufDump(out, pid) }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // 停止抓取
  ipcMain.handle('capture:stop', () => {
    stopPoller()
    return { ok: true }
  })

  // 导出抓取数据到 xlsx（数据由渲染层从 store 提取后传入，主进程负责用 exceljs 写文件）
  ipcMain.handle('capture:export-xlsx', async (_e, payload: ExportPayload) => {
    if (!mainWindow) return { ok: false, error: '主窗口未就绪' }
    try {
      const wb = new ExcelJS.Workbook()
      wb.creator = 'AndroidMemProfiler'
      wb.created = new Date()

      const pad = (n: number) => String(n).padStart(2, '0')
      const fmtTime = (ts: number) => {
        const d = new Date(ts)
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      }
      const labelOf = (p: { name: string; alias?: string }) => p.alias ?? p.name
      // Excel sheet 名禁用 \ / ? * [ ] : 且最长 31 字符；重名追加序号
      const usedNames = new Set<string>()
      const safeSheetName = (s: string) => {
        let n = s.replace(/[\\/?*\[\]:]/g, '_').slice(0, 31)
        let i = 2
        while (usedNames.has(n)) n = `${s.replace(/[\\/?*\[\]:]/g, '_')}`.slice(0, 28) + ` ${i++}`
        usedNames.add(n)
        return n
      }

      // 收集所有 tick 时间戳并集，按升序（同 tick 各进程同 ts，构成统一时间轴）
      const tsSet = new Set<number>()
      for (const p of payload.procs) {
        for (const d of payload.dumpsys[p.name] ?? []) tsSet.add(d.ts)
        for (const d of payload.dmabuf[p.name] ?? []) tsSet.add(d.ts)
      }
      const tsList = [...tsSet].sort((a, b) => a - b)
      // 每进程按 ts 建索引，避免逐行 find
      const dsMap = new Map<string, Map<number, ExportDumpsysPoint>>()
      const dmMap = new Map<string, Map<number, ExportDmabufPoint>>()
      for (const p of payload.procs) {
        dsMap.set(p.name, new Map((payload.dumpsys[p.name] ?? []).map((d) => [d.ts, d])))
        dmMap.set(p.name, new Map((payload.dmabuf[p.name] ?? []).map((d) => [d.ts, d])))
      }

      // Sheet1 汇总趋势：时间 + 各进程 PSS + 合计 PSS + 合计 dmabuf + 总占用(PSS+dmabuf)
      // PSS 为 cmf 口径（dumpsys TOTAL − EGL mtrack）；dmabuf 为分配者口径（meminfo_ion[pid]，不跨进程重复）。
      // 总占用 = PSS + dmabuf，对齐 camera-memory-fetcher（不再有旧 dmabuf_dump 映射口径的跨进程共享重复）。
      const summary = wb.addWorksheet('汇总趋势')
      summary.columns = [
        { header: '时间', key: 'ts', width: 12 },
        ...payload.procs.map((p) => ({ header: `${labelOf(p)} PSS(KB)`, key: `pss_${p.name}`, width: 16 })),
        { header: '合计 PSS(KB)', key: 'totalPss', width: 14 },
        { header: '合计 dmabuf(KB)', key: 'totalDma', width: 16 },
        { header: '总占用 PSS+dmabuf(KB)', key: 'totalCombined', width: 20 }
      ]
      for (const ts of tsList) {
        const row: Record<string, number | string> = { ts: fmtTime(ts) }
        let totalPss = 0
        let totalDma = 0
        for (const p of payload.procs) {
          const ds = dsMap.get(p.name)?.get(ts)
          const dm = dmMap.get(p.name)?.get(ts)
          const pss = ds?.pss ?? 0
          row[`pss_${p.name}`] = pss
          totalPss += pss
          totalDma += dm?.ionKb ?? 0
        }
        row.totalPss = totalPss
        row.totalDma = totalDma
        row.totalCombined = totalPss + totalDma
        summary.addRow(row)
      }
      summary.getRow(1).font = { bold: true }

      // Sheet2..N 每进程明细：dumpsys PSS(减EGL)/EGL mtrack/RSS + dmabuf 分配量（cmf 口径）
      for (const p of payload.procs) {
        const ws = wb.addWorksheet(safeSheetName(labelOf(p)))
        ws.columns = [
          { header: '时间', key: 'ts', width: 12 },
          { header: 'PSS(减EGL)(KB)', key: 'pss', width: 14 },
          { header: 'EGL mtrack(KB)', key: 'eglMtrack', width: 14 },
          { header: 'RSS(KB)', key: 'rss', width: 12 },
          { header: 'dmabuf 分配(KB)', key: 'ionKb', width: 14 }
        ]
        for (const ts of tsList) {
          const ds = dsMap.get(p.name)?.get(ts)
          const dm = dmMap.get(p.name)?.get(ts)
          ws.addRow({
            ts: fmtTime(ts),
            pss: ds?.pss ?? 0,
            eglMtrack: ds?.eglMtrackPss ?? 0,
            rss: ds?.rss ?? 0,
            ionKb: dm?.ionKb ?? 0
          })
        }
        ws.getRow(1).font = { bold: true }
      }

      // Sheet 末 整机 /proc/meminfo（仅当抓取了系统内存）
      if (payload.systemMem.length > 0) {
        const ws = wb.addWorksheet('整机meminfo')
        const fieldKeys = ['MemTotal', 'MemFree', 'MemAvailable', 'Buffers', 'Cached', 'SwapTotal', 'SwapFree', 'Shmem']
        const present = fieldKeys.filter((k) => payload.systemMem.some((m) => k in m.fields))
        ws.columns = [
          { header: '时间', key: 'ts', width: 12 },
          ...present.map((k) => ({ header: `${k}(KB)`, key: k, width: 16 }))
        ]
        for (const m of payload.systemMem) {
          const row: Record<string, number | string> = { ts: fmtTime(m.ts) }
          for (const k of present) row[k] = m.fields[k] ?? ''
          ws.addRow(row)
        }
        ws.getRow(1).font = { bold: true }
      }

      // 默认文件名：memory-YYYY-MM-DD-HH-MM-SS.xlsx
      const s = new Date(payload.startedAt)
      const fname = `memory-${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}-${pad(s.getHours())}-${pad(s.getMinutes())}-${pad(s.getSeconds())}.xlsx`
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: '导出内存数据',
        defaultPath: fname,
        filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return { ok: false, canceled: true }
      await wb.xlsx.writeFile(filePath)
      return { ok: true, filePath }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  // 窗口控制：自定义 JS 拖动。app-region drag 在 Windows 走同步模态拖动会冻结渲染主线程
  //（contentTracing 实测拖动时 61.7% 主线程被冻、图表停），改由主进程轮询鼠标屏幕坐标 +
  // setPosition 逐帧驱动窗口移动，主线程不冻结，数据 tick 与图表更新正常进行。
  // startDrag：记录起点（光标屏幕坐标 + 窗口位置），启动 16ms 轮询；stopDrag：停止。
  // 不依赖渲染 mousemove——窗口跟随会让鼠标相对窗口坐标不变、mousemove 不触发，拖动中断。
  // mouseup 丢失兜底：轮询超 5s 自动停。toggleMaximize 供标题栏双击。
  ipcMain.on('window:startDrag', () => {
    if (!mainWindow) return
    const startCursor = screen.getCursorScreenPoint()
    const [wx, wy] = mainWindow.getPosition()
    if (dragTimer) clearInterval(dragTimer)
    const startedAt = Date.now()
    dragTimer = setInterval(() => {
      if (!mainWindow || !dragTimer) return
      const c = screen.getCursorScreenPoint()
      mainWindow.setPosition(wx + c.x - startCursor.x, wy + c.y - startCursor.y, false)
      if (Date.now() - startedAt > 5000) { clearInterval(dragTimer); dragTimer = null }
    }, 16)
  })
  ipcMain.on('window:stopDrag', () => {
    if (dragTimer) { clearInterval(dragTimer); dragTimer = null }
  })
  ipcMain.on('window:toggleMaximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
}
