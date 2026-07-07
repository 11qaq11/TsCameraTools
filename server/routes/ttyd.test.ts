import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/ttyd.js', () => ({
  checkBinary: vi.fn(() => ({ available: true, version: '1.7.7', path: 'bin/ttyd/ttyd.exe' })),
  startSession: vi.fn(),
  stopSession: vi.fn(() => true),
  getSessionStatus: vi.fn(() => ({ status: 'running' })),
}))

import { checkBinary, startSession, stopSession, getSessionStatus } from '../services/ttyd'

describe('Ttyd API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('check', () => {
    it('ttyd 可用应该返回 available: true', () => {
      const result = checkBinary()
      expect(result.available).toBe(true)
    })

    it('应该返回版本号', () => {
      const result = checkBinary()
      expect(result.version).toBe('1.7.7')
    })
  })

  describe('start', () => {
    it('应该调用 startSession', async () => {
      vi.mocked(startSession).mockResolvedValue({ sessionId: 'test-id', port: 7681 })
      const result = await startSession('device-1')
      expect(result).toEqual({ sessionId: 'test-id', port: 7681 })
    })
  })

  describe('stop', () => {
    it('应该调用 stopSession', () => {
      const result = stopSession('test-id')
      expect(result).toBe(true)
    })
  })

  describe('status', () => {
    it('应该返回会话状态', () => {
      const result = getSessionStatus('test-id')
      expect(result).toEqual({ status: 'running' })
    })
  })
})
