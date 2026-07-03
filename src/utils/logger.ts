const LOG_PREFIX = '[TsCameraTools]'

export function log(level: 'INFO' | 'WARN' | 'ERROR', component: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [${level}] [${component}] ${message}`
  
  // Write to console
  if (level === 'ERROR') {
    console.error(LOG_PREFIX, logEntry, data || '')
  } else if (level === 'WARN') {
    console.warn(LOG_PREFIX, logEntry, data || '')
  } else {
    console.log(LOG_PREFIX, logEntry, data || '')
  }
  
  // Write to file via Electron API (if available)
  if (window.electronAPI?.writeLog) {
    window.electronAPI.writeLog(logEntry + (data ? ' ' + JSON.stringify(data) : ''))
  }
}

export function info(component: string, message: string, data?: unknown) {
  log('INFO', component, message, data)
}

export function warn(component: string, message: string, data?: unknown) {
  log('WARN', component, message, data)
}

export function error(component: string, message: string, data?: unknown) {
  log('ERROR', component, message, data)
}
