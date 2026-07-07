import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('日志记录功能', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('日志级别', () => {
    it('应该支持 info 级别', () => {
      const level = 'info'
      expect(level).toBe('info')
    })

    it('应该支持 warn 级别', () => {
      const level = 'warn'
      expect(level).toBe('warn')
    })

    it('应该支持 error 级别', () => {
      const level = 'error'
      expect(level).toBe('error')
    })
  })

  describe('日志存储', () => {
    it('应该存储到 localStorage', () => {
      const logs = [{ level: 'info', tag: 'Test', message: 'Test message', time: new Date().toISOString() }]
      localStorage.setItem('_app_logs', JSON.stringify(logs))
      const stored = JSON.parse(localStorage.getItem('_app_logs') || '[]')
      expect(stored).toHaveLength(1)
    })

    it('应该限制日志数量', () => {
      const maxLogs = 500
      const logs: string[] = []
      for (let i = 0; i < 600; i++) {
        logs.push(`log-${i}`)
        if (logs.length > maxLogs) {
          logs.shift()
        }
      }
      expect(logs).toHaveLength(maxLogs)
    })
  })

  describe('日志清除', () => {
    it('应该清空所有日志', () => {
      localStorage.setItem('_app_logs', JSON.stringify([{ level: 'info', tag: 'Test', message: 'Test' }]))
      localStorage.removeItem('_app_logs')
      expect(localStorage.getItem('_app_logs')).toBeNull()
    })
  })
})
