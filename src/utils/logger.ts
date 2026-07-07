// 前端操作日志 - 输出到 console、页面日志面板、后端文件
const LOG_KEY = '_app_logs'
const LOG_BATCH_SIZE = 10
const LOG_FLUSH_INTERVAL = 2000

interface LogEntry {
  level: string
  tag: string
  message: string
  data?: unknown
  time: string
}

// 日志缓冲区
let logBuffer: LogEntry[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

// 启动定时刷新
function startFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushLogs()
  }, LOG_FLUSH_INTERVAL)
}

// 刷新日志到后端
async function flushLogs() {
  if (logBuffer.length === 0) return
  
  const batch = logBuffer.splice(0, LOG_BATCH_SIZE)
  
  try {
    await fetch('/api/logs/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: batch })
    })
  } catch (err) {
    // 发送失败，放回缓冲区
    logBuffer.unshift(...batch)
    console.error('[Logger] Failed to send logs to backend:', err)
  }
}

function getLogs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

function addLog(level: string, tag: string, msg: string, data?: unknown) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  const entry = `[${time}][${level}][${tag}] ${msg}${dataStr}`
  
  // 输出到 console
  if (level === 'ERROR') console.error(entry)
  else if (level === 'WARN') console.warn(entry)
  else console.log(entry)
  
  // 存储到 localStorage（最多保留 500 条）
  const logs = getLogs()
  logs.push(entry)
  if (logs.length > 500) logs.splice(0, logs.length - 500)
  localStorage.setItem(LOG_KEY, JSON.stringify(logs))
  
  // 添加到发送缓冲区
  logBuffer.push({ level, tag, message: msg, data, time: new Date().toISOString() })
  
  // 缓冲区满时立即发送
  if (logBuffer.length >= LOG_BATCH_SIZE) {
    flushLogs()
  }
  
  // 启动定时刷新
  startFlushTimer()
}

export const logger = {
  info: (tag: string, msg: string, data?: unknown) => addLog('INFO', tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => addLog('ERROR', tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) => addLog('WARN', tag, msg, data),
  
  getLogs: (): string[] => getLogs(),
  
  clearLogs: () => localStorage.removeItem(LOG_KEY),
  
  dumpLogs: (): string => getLogs().join('\n'),
  
  // 手动刷新日志到后端
  flush: () => flushLogs()
}
