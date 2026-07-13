import { describe, it, expect, beforeEach } from 'vitest'
import { getLogs, debugLogger } from './debug.js'

describe('Debug Logs API', () => {
  beforeEach(() => {
    // Clear buffer by writing fresh logs
    // The buffer is internal, but we can test via getLogs
  })

  describe('log buffer management', () => {
    it('should store log entries via debugLogger', () => {
      debugLogger.info('test message')
      const logs = getLogs()
      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs.some(l => l.msg === 'test message')).toBe(true)
    })
  })

  describe('getLogs filtering', () => {
    it('should return logs array', () => {
      debugLogger.info('info message')
      debugLogger.error('error message')

      const logs = getLogs()
      expect(logs.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by minimum level', () => {
      debugLogger.trace('trace message')
      debugLogger.info('info for level filter')
      debugLogger.error('error for level filter')

      // level 50 = error, 40 = warn, 30 = info, 20 = trace
      const errors = getLogs({ level: 50 })
      expect(errors.every(e => e.level >= 50)).toBe(true)
    })

    it('should support limit pagination', () => {
      const logs = getLogs({ limit: 2 })
      expect(logs.length).toBeLessThanOrEqual(2)
    })

    it('should support offset pagination', () => {
      const allLogs = getLogs()
      const offsetLogs = getLogs({ offset: 1, limit: 1 })
      if (allLogs.length >= 2) {
        expect(offsetLogs).toHaveLength(1)
        expect(offsetLogs[0]).toEqual(allLogs[1])
      }
    })
  })
})
