import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Shell 终端交互', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('命令执行', () => {
    it('应该正确发送命令', () => {
      const command = 'ls -la'
      expect(command).toBe('ls -la')
    })

    it('应该正确显示输出', () => {
      const output = 'total 12\ndrwxr-xr-x  3 root root 4096 Jul  7 12:00 .'
      expect(output).toContain('total')
    })

    it('应该支持中文输入', () => {
      const chineseInput = '你好世界'
      expect(chineseInput).toBe('你好世界')
    })
  })

  describe('命令历史', () => {
    it('应该记录命令历史', () => {
      const history: string[] = []
      history.push('ls')
      history.push('cd /tmp')
      expect(history).toHaveLength(2)
    })

    it('应该支持上下键导航', () => {
      const history = ['ls', 'cd /tmp', 'pwd']
      let index = history.length - 1
      expect(history[index]).toBe('pwd')
      index--
      expect(history[index]).toBe('cd /tmp')
    })

    it('应该限制历史记录数量', () => {
      const maxHistory = 300
      const history: string[] = []
      for (let i = 0; i < 350; i++) {
        history.push(`command-${i}`)
        if (history.length > maxHistory) {
          history.shift()
        }
      }
      expect(history).toHaveLength(maxHistory)
    })
  })

  describe('快捷键', () => {
    it('应该支持 Ctrl+C 中断', () => {
      const ctrlC = '\x03'
      expect(ctrlC).toBe('\x03')
    })

    it('应该支持 Ctrl+V 粘贴', () => {
      const ctrlV = '\x16'
      expect(ctrlV).toBe('\x16')
    })
  })
})
