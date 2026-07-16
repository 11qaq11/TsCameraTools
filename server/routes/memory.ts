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
    res.json({ ok: true, data: parseShowmap(Number(req.params.pid), out) })
  } catch (e) {
    res.json({ ok: false, error: (e as Error).message })
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

export default router
