import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDebug = process.env.DEBUG === 'true'
const LOG_DIR = path.join(__dirname, '..', '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'ttyd-debug.log')

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

export function debugLog(tag: string, message: string, data?: unknown) {
  if (!isDebug) return

  const time = new Date().toISOString()
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  const entry = `[${time}][DEBUG][${tag}] ${message}${dataStr}\n`

  console.log(entry.trim())

  try {
    ensureLogDir()
    fs.appendFileSync(LOG_FILE, entry)
  } catch {
    console.error('[DebugLogger] Failed to write log file')
  }
}

export { isDebug }
