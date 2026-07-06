// 前端操作日志 - 同时输出到 console 和页面上的日志面板
const LOG_KEY = '_app_logs'

function getLogs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
  } catch {
    return []
  }
}

function addLog(level: string, tag: string, msg: string, data?: unknown) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
  const entry = `[${time}][${level}][${tag}] ${msg}${dataStr}`
  
  // 输出到 console
  if (level === 'ERROR') console.error(entry)
  else console.log(entry)
  
  // 存储到 localStorage（最多保留 200 条）
  const logs = getLogs()
  logs.push(entry)
  if (logs.length > 200) logs.splice(0, logs.length - 200)
  localStorage.setItem(LOG_KEY, JSON.stringify(logs))
}

export const logger = {
  info: (tag: string, msg: string, data?: unknown) => addLog('INFO', tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => addLog('ERROR', tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) => addLog('WARN', tag, msg, data),
  
  getLogs: (): string[] => getLogs(),
  
  clearLogs: () => localStorage.removeItem(LOG_KEY),
  
  dumpLogs: (): string => getLogs().join('\n')
}
