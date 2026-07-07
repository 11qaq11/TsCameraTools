import { describe, it, expect, beforeEach, vi } from 'vitest'
import { logger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('info', () => {
    it('应该记录 info 级别日志', () => {
      logger.info('TestTag', 'Test message')
      const logs = logger.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  describe('warn', () => {
    it('应该记录 warn 级别日志', () => {
      logger.warn('TestTag', 'Warning message')
      const logs = logger.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  describe('error', () => {
    it('应该记录 error 级别日志', () => {
      logger.error('TestTag', 'Error message')
      const logs = logger.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  describe('getLogs', () => {
    it('应该返回所有日志', () => {
      logger.info('Tag1', 'Message 1')
      logger.warn('Tag2', 'Message 2')
      logger.error('Tag3', 'Message 3')
      const logs = logger.getLogs()
      expect(logs.length).toBe(3)
    })
  })

  describe('clearLogs', () => {
    it('应该清空所有日志', () => {
      logger.info('Tag', 'Message')
      logger.clearLogs()
      const logs = logger.getLogs()
      expect(logs.length).toBe(0)
    })
  })
})
