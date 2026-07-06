import { Router } from 'express'
import { exec } from 'child_process'
import { config } from '../config.js'

const router = Router()

// 检测 ADB 可用性
router.get('/check', (req, res) => {
  const adbPath = config.adb.path
  console.log('[ADB] Checking ADB at path:', adbPath)
  
  exec(`"${adbPath}" version`, (error, stdout, stderr) => {
    if (error) {
      console.log('[ADB] Check failed:', error.message)
      res.json({ available: false, message: 'ADB not found' })
    } else {
      const version = stdout.trim().split('\n')[0]
      console.log('[ADB] Check success:', version)
      res.json({ available: true, version })
    }
  })
})

// 获取设备列表
router.get('/devices', (req, res) => {
  const adbPath = config.adb.path
  
  exec(`"${adbPath}" devices`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to get devices' })
    }

    const lines = stdout.trim().split('\n').slice(1) // 跳过第一行标题
    const devices = lines
      .filter(line => line.trim())
      .map(line => {
        const [serial, status] = line.split('\t')
        return {
          serial: serial.trim(),
          status: status.trim() as 'device' | 'offline' | 'unauthorized',
          model: serial.trim() // 简化版，实际应获取 model
        }
      })

    res.json({ devices })
  })
})

// 执行 Root
router.post('/root/:serial', (req, res) => {
  const { serial } = req.params
  const adbPath = config.adb.path
  
  exec(`"${adbPath}" -s ${serial} root`, (error, stdout, stderr) => {
    if (error) {
      res.json({ success: false, message: stderr || error.message })
    } else {
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
      res.json({ success: false, message: stderr || error.message })
    } else {
      res.json({ success: true, message: stdout.trim() })
    }
  })
})

export default router
