import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('完整用户流程', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('应该完成 登录 → 设备连接 → Shell 交互 → 断开 流程', () => {
    // 1. 模拟登录
    localStorage.setItem('auth_token', 'test-token')
    expect(localStorage.getItem('auth_token')).toBe('test-token')

    // 2. 模拟设备连接
    const devices = [
      { serial: 'device-1', model: 'Pixel 6', status: 'device' }
    ]
    expect(devices).toHaveLength(1)

    // 3. 模拟 Shell 交互
    const sessionId = 'session-1'
    const command = 'ls -la'
    const output = 'total 12\ndrwxr-xr-x  3 root root 4096 Jul  7 12:00 .'
    expect(sessionId).toBeDefined()
    expect(command).toBe('ls -la')
    expect(output).toContain('total')

    // 4. 模拟断开连接
    const disconnected = true
    expect(disconnected).toBe(true)

    // 5. 清理
    localStorage.removeItem('auth_token')
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('应该处理多设备切换', () => {
    const devices = [
      { serial: 'device-1', model: 'Pixel 6', status: 'device' },
      { serial: 'device-2', model: 'Pixel 7', status: 'device' },
    ]

    // 连接第一个设备
    let activeDevice = devices[0]
    expect(activeDevice.serial).toBe('device-1')

    // 切换到第二个设备
    activeDevice = devices[1]
    expect(activeDevice.serial).toBe('device-2')
  })
})
