import { Router } from 'express'
import { exec } from 'child_process'
import { config } from '../config.js'
import { logger } from '../utils/logger.js'

const log = logger.child({ module: 'adb-routes' })
const router = Router()

// 检测 ADB 可用性
router.get('/check', (_req, res) => {
  const adbPath = config.adb.path
  log.debug({ adbPath }, 'Checking ADB availability')

  exec(`"${adbPath}" version`, (error, stdout, _stderr) => {
    if (error) {
      log.warn({ error: error.message }, 'ADB check failed')
      res.json({ available: false, message: 'ADB not found' })
    } else {
      const version = stdout.trim().split('\n')[0]
      log.info({ version }, 'ADB check success')
      res.json({ available: true, version })
    }
  })
})

// 获取设备列表
router.get('/devices', (_req, res) => {
  const adbPath = config.adb.path

  exec(`"${adbPath}" devices`, (error, stdout, _stderr) => {
    if (error) {
      log.error({ error: error.message }, 'Failed to get devices')
      return res.status(500).json({ error: 'Failed to get devices' })
    }

    try {
      const lines = stdout.trim().split('\n').slice(1)
      const devices = lines
        .filter(line => line.trim())
        .map(line => {
          const [serial, status] = line.split('\t')
          return {
            serial: serial.trim(),
            status: status.trim() as 'device' | 'offline' | 'unauthorized',
            model: serial.trim()
          }
        })

      log.debug({ count: devices.length }, 'Devices listed')
      res.json({ devices })
    } catch (parseErr) {
      log.error({ error: (parseErr as Error).message, stdout }, 'Failed to parse devices output')
      res.status(500).json({ error: 'Failed to parse devices' })
    }
  })
})

// 执行 Root
router.post('/root/:serial', (req, res) => {
  const { serial } = req.params
  const adbPath = config.adb.path

  exec(`"${adbPath}" -s ${serial} root`, (error, stdout, stderr) => {
    if (error) {
      log.error({ serial, error: stderr || error.message }, 'ADB root failed')
      res.json({ success: false, message: stderr || error.message })
    } else {
      log.info({ serial, message: stdout.trim() }, 'ADB root success')
      res.json({ success: true, message: stdout.trim() })
    }
  })
})

// 执行 Remount
router.post('/remount/:serial', (req, res) => {
  const { serial } = req.params
  const adbPath = config.adb.path

  exec(`"${adbPath}" -s ${serial} remount`, (error, stdout, stderr) => {
    if (error) {
      log.error({ serial, error: stderr || error.message }, 'ADB remount failed')
      res.json({ success: false, message: stderr || error.message })
    } else {
      log.info({ serial, message: stdout.trim() }, 'ADB remount success')
      res.json({ success: true, message: stdout.trim() })
    }
  })
})

export default router
