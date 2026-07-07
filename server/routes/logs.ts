import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// 获取当前日志文件名（按日期）
function getLogFileName(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  return `${date}_${hour}-${minute}.log`
}

// 确保日志目录存在
function ensureLogDir(): string {
  const logDir = path.join(__dirname, '..', '..', 'logs')
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

// 接收前端日志
router.post('/log', (req, res) => {
  try {
    const { level, tag, message, data } = req.body
    const time = new Date().toISOString()
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
    const entry = `[${time}][${level}][${tag}] ${message}${dataStr}\n`
    
    const logDir = ensureLogDir()
    const logFile = path.join(logDir, getLogFileName())
    fs.appendFileSync(logFile, entry)
    
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to write log:', err)
    res.status(500).json({ error: 'Failed to write log' })
  }
})

// 批量接收前端日志
router.post('/logs', (req, res) => {
  try {
    const { logs } = req.body
    const logDir = ensureLogDir()
    const logFile = path.join(logDir, getLogFileName())
    
    const entries = logs.map((log: { level: string; tag: string; message: string; data?: unknown }) => {
      const time = new Date().toISOString()
      const dataStr = log.data !== undefined ? ` ${JSON.stringify(log.data)}` : ''
      return `[${time}][${log.level}][${log.tag}] ${log.message}${dataStr}\n`
    }).join('')
    
    fs.appendFileSync(logFile, entries)
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to write logs:', err)
    res.status(500).json({ error: 'Failed to write logs' })
  }
})

// 获取日志文件列表
router.get('/files', (req, res) => {
  try {
    const logDir = ensureLogDir()
    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(logDir, f)).size,
        modified: fs.statSync(path.join(logDir, f)).mtime
      }))
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
    
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list log files' })
  }
})

export default router
