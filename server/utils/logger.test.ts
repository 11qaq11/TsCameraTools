import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('logger instance', () => {
    it('应该导出 pino logger 实例', async () => {
      const { logger } = await import('./logger')
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })

    it('应该根据 LOG_LEVEL 设置日志级别', async () => {
      process.env.LOG_LEVEL = 'warn'
      const { logger } = await import('./logger')
      expect(logger.level).toBe('warn')
    })

    it('应该默认使用 info 级别', async () => {
      delete process.env.LOG_LEVEL
      const { logger } = await import('./logger')
      expect(logger.level).toBe('info')
    })
  })

  describe('createChildLogger', () => {
    it('应该导出 createChildLogger 函数', async () => {
      const { createChildLogger } = await import('./logger')
      expect(typeof createChildLogger).toBe('function')
    })

    it('应该返回带有 context 的子 logger', async () => {
      const { createChildLogger } = await import('./logger')
      const child = createChildLogger({ module: 'test-module' })
      expect(child).toBeDefined()
      expect(typeof child.info).toBe('function')
    })

    it('子 logger 应该继承父 logger 的级别', async () => {
      process.env.LOG_LEVEL = 'error'
      const { createChildLogger } = await import('./logger')
      const child = createChildLogger({ module: 'test' })
      expect(child.level).toBe('error')
    })
  })
})
