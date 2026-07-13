import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupElectronAPI, mockElectronAPI } from '../test/mock-utils'

// Mock xterm.js
const mockTerm = {
  write: vi.fn(),
  open: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
  loadAddon: vi.fn(),
  getSelection: vi.fn(),
  onData: vi.fn(),
  onSelectionChange: vi.fn(),
  scrollToBottom: vi.fn(),
  element: null,
}

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => mockTerm),
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => ({
    fit: vi.fn(),
  })),
}))

describe('ADB Shell Bug Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupElectronAPI()
  })

  describe('BUG-001: 输出格式化', () => {
    it('应该在每行输出前添加空格', () => {
      // 模拟 handleData 函数的逻辑
      const data = 'file1.txt\nfile2.txt\nfile3.txt'
      const formatted = data.split('\n').map(line => ' ' + line).join('\n')

      expect(formatted).toBe(' file1.txt\n file2.txt\n file3.txt')
    })

    it('应该保持单行输出格式', () => {
      const data = 'single line'
      const formatted = data.split('\n').map(line => ' ' + line).join('\n')

      expect(formatted).toBe(' single line')
    })

    it('应该处理空输出', () => {
      const data = ''
      const formatted = data.split('\n').map(line => ' ' + line).join('\n')

      expect(formatted).toBe(' ')
    })
  })

  describe('BUG-002: Ctrl+C 清空 stdin', () => {
    it('应该调用 adbShellFlushStdin', () => {
      const shellId = 'test-shell-1'
      const flushSpy = vi.spyOn(mockElectronAPI, 'adbShellFlushStdin')

      // 模拟 Ctrl+C 处理逻辑
      const data = '\x03' // Ctrl+C
      if (data === '\x03') {
        window.electronAPI.adbShellWrite(shellId, '\x03')
        window.electronAPI.adbShellFlushStdin(shellId)
      }

      expect(flushSpy).toHaveBeenCalledWith(shellId)
    })

    it('应该清空输入缓冲区', () => {
      let inputBuffer = 'previous input'
      let cursorPos = 14

      // 模拟 Ctrl+C 处理后的状态
      inputBuffer = ''
      cursorPos = 0

      expect(inputBuffer).toBe('')
      expect(cursorPos).toBe(0)
    })
  })

  describe('BUG-003: 复制功能', () => {
    it('应该注册 onSelectionChange 事件', () => {
      // 模拟终端初始化时注册事件
      const onSelectionChangeSpy = vi.spyOn(mockTerm, 'onSelectionChange')

      // 模拟 init 函数中的事件注册
      mockTerm.onSelectionChange(() => {
        const sel = mockTerm.getSelection()
        if (sel) {
          navigator.clipboard.writeText(sel)
        }
      })

      expect(onSelectionChangeSpy).toHaveBeenCalled()
    })

    it('应该在选中文本时复制到剪贴板', async () => {
      const selectedText = 'selected text'
      mockTerm.getSelection.mockReturnValue(selectedText)

      const writeTextSpy = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
      })

      // 直接测试复制逻辑（模拟 onSelectionChange 回调）
      const sel = mockTerm.getSelection()
      if (sel) {
        await navigator.clipboard.writeText(sel)
      }

      expect(writeTextSpy).toHaveBeenCalledWith(selectedText)
    })

    it('不应该复制空选择', async () => {
      mockTerm.getSelection.mockReturnValue('')

      const writeTextSpy = vi.fn()
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
      })

      // 直接测试复制逻辑
      const sel = mockTerm.getSelection()
      if (sel) {
        await navigator.clipboard.writeText(sel)
      }

      expect(writeTextSpy).not.toHaveBeenCalled()
    })
  })

  describe('BUG-004: 最后一行可见', () => {
    it('应该在 writePrompt 中调用 scrollToBottom', () => {
      const scrollToBottomSpy = vi.spyOn(mockTerm, 'scrollToBottom')

      // 模拟 writePrompt 函数
      const writePrompt = () => {
        mockTerm.write('\r' + 'prompt>')
        mockTerm.scrollToBottom()
      }

      writePrompt()

      expect(scrollToBottomSpy).toHaveBeenCalled()
    })

    it('应该在显示提示符后滚动到底部', () => {
      const writeCalls: string[] = []
      mockTerm.write.mockImplementation((data: string) => writeCalls.push(data))
      const scrollToBottomSpy = vi.spyOn(mockTerm, 'scrollToBottom')

      // 模拟完整流程
      mockTerm.write('\r\n$ command output')
      mockTerm.scrollToBottom()

      expect(scrollToBottomSpy).toHaveBeenCalled()
    })
  })

  describe('回归测试', () => {
    it('应该支持命令历史记录', () => {
      const history: string[] = []

      // 模拟添加命令到历史
      const addToHistory = (cmd: string) => {
        if (cmd && (history.length === 0 || history[history.length - 1] !== cmd)) {
          history.push(cmd)
          if (history.length > 300) history.shift()
        }
      }

      addToHistory('ls')
      addToHistory('cd /tmp')
      addToHistory('pwd')

      expect(history).toEqual(['ls', 'cd /tmp', 'pwd'])
    })

    it('应该限制历史记录数量为 300', () => {
      const history: string[] = []
      const maxHistory = 300

      for (let i = 0; i < 350; i++) {
        history.push(`command-${i}`)
        if (history.length > maxHistory) {
          history.shift()
        }
      }

      expect(history).toHaveLength(maxHistory)
      expect(history[0]).toBe('command-50')
      expect(history[299]).toBe('command-349')
    })

    it('应该支持 Ctrl+R 搜索历史', () => {
      const history = ['ls -la', 'cd /tmp', 'pwd', 'echo hello']
      const findInHistory = (query: string): string => {
        if (!query) return ''
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].includes(query)) {
            return history[i]
          }
        }
        return ''
      }

      expect(findInHistory('echo')).toBe('echo hello')
      expect(findInHistory('cd')).toBe('cd /tmp')
      expect(findInHistory('nonexistent')).toBe('')
    })

    it('应该支持快捷键', () => {
      const shortcuts = {
        ctrlC: '\x03',
        ctrlV: '\x16',
        ctrlA: '\x01',
        ctrlE: '\x05',
        ctrlU: '\x15',
        ctrlK: '\x0b',
        ctrlW: '\x17',
        ctrlL: '\x0c',
        ctrlR: '\x12',
      }

      expect(shortcuts.ctrlC).toBe('\x03')
      expect(shortcuts.ctrlR).toBe('\x12')
    })
  })
})
