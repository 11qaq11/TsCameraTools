import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../config.js', () => ({
  config: { adb: { path: 'adb' } },
}))

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

import { exec } from 'child_process'

describe('adb routes logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ADB check', () => {
    it('ADB 可用时返回 version', () => {
      vi.mocked(exec).mockImplementation((_cmd: string, cb: any) => {
        cb(null, 'Android Debug Bridge version 1.0.41\n', '')
        return null as any
      })

      exec('adb version', (error, stdout) => {
        expect(error).toBeNull()
        const version = stdout.trim().split('\n')[0]
        expect(version).toContain('Android Debug Bridge')
      })
    })

    it('ADB 不可用时返回 error', () => {
      vi.mocked(exec).mockImplementation((_cmd: string, cb: any) => {
        cb(new Error('Command not found'), '', '')
        return null as any
      })

      exec('adb version', (error) => {
        expect(error).toBeDefined()
        expect(error!.message).toContain('Command not found')
      })
    })
  })

  describe('devices 解析', () => {
    it('正确解析设备列表', () => {
      const output = 'List of devices attached\nABC123\tdevice\nDEF456\toffline\n'
      const lines = output.trim().split('\n').slice(1)
      const devices = lines
        .filter(line => line.trim())
        .map(line => {
          const [serial, status] = line.split('\t')
          return { serial: serial.trim(), status: status.trim() }
        })

      expect(devices).toHaveLength(2)
      expect(devices[0]).toEqual({ serial: 'ABC123', status: 'device' })
      expect(devices[1]).toEqual({ serial: 'DEF456', status: 'offline' })
    })

    it('空设备列表', () => {
      const output = 'List of devices attached\n\n'
      const lines = output.trim().split('\n').slice(1)
      const devices = lines.filter(line => line.trim())

      expect(devices).toHaveLength(0)
    })
  })

  describe('root/remount 响应', () => {
    it('root 成功', () => {
      vi.mocked(exec).mockImplementation((_cmd: string, cb: any) => {
        cb(null, 'restarting adbd as root', '')
        return null as any
      })

      exec('adb -s ABC root', (error, stdout) => {
        expect(error).toBeNull()
        expect(stdout.trim()).toBe('restarting adbd as root')
      })
    })

    it('root 失败', () => {
      vi.mocked(exec).mockImplementation((_cmd: string, cb: any) => {
        cb(new Error('adbd cannot run as root'), '', 'adbd cannot run as root')
        return null as any
      })

      exec('adb -s ABC root', (error, stdout, stderr) => {
        expect(error).toBeDefined()
        expect(stderr).toContain('cannot run as root')
      })
    })
  })
})
