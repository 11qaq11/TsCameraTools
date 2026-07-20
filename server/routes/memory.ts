import { Router } from 'express'
import { exec } from 'child_process'
import ExcelJS from 'exceljs'
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
    // 检查是否包含权限错误
    if (out.includes('Failed to parse file') || out.includes('Permission denied')) {
      res.json({
        ok: false,
        error: '需要root权限才能读取smaps文件。请确保设备已root并使用adb root命令。',
        needRoot: true,
      })
      return
    }
    res.json({ ok: true, data: parseShowmap(Number(req.params.pid), out) })
  } catch (e) {
    const errMsg = (e as Error).message
    // 检查是否是权限相关的错误
    if (errMsg.includes('Failed to parse') || errMsg.includes('Permission denied') || errMsg.includes('smaps')) {
      res.json({
        ok: false,
        error: '需要root权限才能读取smaps文件。请确保设备已root并使用adb root命令。',
        needRoot: true,
      })
    } else {
      res.json({ ok: false, error: errMsg })
    }
  }
})

// dmabuf_dump
router.get('/dmabuf-dump/:serial/:pid', async (req, res) => {
  try {
    const out = await shell(req.params.serial, `dmabuf_dump ${req.params.pid}`)
    res.json({ ok: true, data: parseDmabufDump(Number(req.params.pid), out) })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
  }
})

// 导出内存数据为 xlsx
router.post('/export-xlsx', async (req, res) => {
  try {
    const { procs, dumpsys, dmabuf, systemMem, startedAt } = req.body as {
      procs: string[]
      dumpsys: Record<string, { ts: number; data: { pid: number; totalPss: number; eglMtrackPss: number; totalRss: number } }[]>
      dmabuf: Record<string, { ts: number; data: { pid: number; ionKb: number } }[]>
      systemMem: { ts: number; data: { fields: Record<string, number> } }[]
      startedAt: number
    }

    const wb = new ExcelJS.Workbook()
    wb.created = new Date()

    const fmtTime = (ts: number) => {
      const d = new Date(ts)
      const ms = String(d.getMilliseconds()).padStart(3, '0')
      return `${d.toLocaleTimeString('zh-CN')}.${ms}`
    }

    // Sheet1: 汇总趋势
    const ws1 = wb.addWorksheet('汇总趋势')
    const summaryHeader = ['时间']
    for (const name of procs) summaryHeader.push(`${name} PSS(KB)`)
    summaryHeader.push('合计 PSS(KB)', '合计 dmabuf(KB)', '总占用(KB)')
    ws1.addRow(summaryHeader)

    // 收集所有时间戳
    const allTs = new Set<number>()
    for (const name of procs) {
      for (const s of (dumpsys[name] ?? [])) allTs.add(s.ts)
      for (const s of (dmabuf[name] ?? [])) allTs.add(s.ts)
    }
    const sortedTs = [...allTs].sort((a, b) => a - b)

    for (const ts of sortedTs) {
      const row: (string | number)[] = [fmtTime(ts)]
      let totalPss = 0
      let totalDmabuf = 0
      for (const name of procs) {
        const ds = dumpsys[name]?.find(s => s.ts === ts)
        const pss = ds?.data.totalPss ?? 0
        row.push(pss || '')
        totalPss += pss
        const dm = dmabuf[name]?.find(s => s.ts === ts)
        totalDmabuf += dm?.data.ionKb ?? 0
      }
      row.push(totalPss, totalDmabuf, totalPss + totalDmabuf)
      ws1.addRow(row)
    }

    // Sheet2..N: 每进程明细
    for (const name of procs) {
      const ws = wb.addWorksheet(name.substring(0, 31)) // Excel 限制 31 字符
      ws.addRow(['时间', 'PSS(KB)', 'EGL mtrack(KB)', 'RSS(KB)', 'dmabuf(KB)'])

      const dumps = dumpsys[name] ?? []
      const dms = dmabuf[name] ?? []
      const allProcTs = new Set<number>()
      for (const s of dumps) allProcTs.add(s.ts)
      for (const s of dms) allProcTs.add(s.ts)
      const procTs = [...allProcTs].sort((a, b) => a - b)

      for (const ts of procTs) {
        const ds = dumps.find(s => s.ts === ts)?.data
        const dm = dms.find(s => s.ts === ts)?.data
        ws.addRow([
          fmtTime(ts),
          ds?.totalPss ?? '',
          ds?.eglMtrackPss ?? '',
          ds?.totalRss ?? '',
          dm?.ionKb ?? '',
        ])
      }
    }

    // 末 sheet: 整机 meminfo
    if (systemMem.length > 0) {
      const wsMem = wb.addWorksheet('meminfo')
      const fields = Object.keys(systemMem[0].data.fields)
      wsMem.addRow(['时间', ...fields])
      for (const s of systemMem) {
        const row: (string | number)[] = [fmtTime(s.ts)]
        for (const f of fields) row.push(s.data.fields[f] ?? '')
        wsMem.addRow(row)
      }
    }

    const filename = `memory_${new Date(startedAt || Date.now()).toISOString().replace(/[:.]/g, '-').substring(0, 19)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    await wb.xlsx.write(res)
    res.end()
  } catch (e) {
    log.error({ error: (e as Error).message }, 'Export xlsx failed')
    res.status(500).json({ error: (e as Error).message })
  }
})

export default router
