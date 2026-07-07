import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  })),
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
  },
}))

import { checkBinary, startSession, stopSession, getSessionStatus } from './ttyd'

describe('TtydService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkBinary', () => {
    it('应该返回 available: true', () => {
      const result = checkBinary()
      expect(result.available).toBe(true)
    })

    it('应该返回版本号', () => {
      const result = checkBinary()
      expect(result.version).toBe('1.7.7')
    })

    it('应该返回二进制路径', () => {
      const result = checkBinary()
      expect(result.path).toContain('ttyd.exe')
    })
  })

  describe('stopSession', () => {
    it('不存在的 sessionId 应该返回 false', () => {
      const result = stopSession('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('getSessionStatus', () => {
    it('不存在的 sessionId 应该返回 null', () => {
      const result = getSessionStatus('non-existent-id')
      expect(result).toBeNull()
    })
  })
})
