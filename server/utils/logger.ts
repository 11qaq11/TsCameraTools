import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logDir = path.join(__dirname, '..', '..', 'logs')

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

const level = process.env.LOG_LEVEL || 'info'
const logFile = path.join(logDir, 'server.log')

export const logger = pino({
  level,
}, pino.destination(logFile))

export function createChildLogger(context: Record<string, string>) {
  return logger.child(context)
}
