import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, X, Download, AlertTriangle } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import type { AdbDevice } from '../types'
import { logger } from '../utils/logger'

// Debug log → 写入本地文件 (logs/renderer.log via IPC)
const debugLog = (msg: string, data?: Record<string, unknown>) => {
  const entry = data ? `${msg} ${JSON.stringify(data)}` : msg
  window.electronAPI?.writeLog?.(`[IME-DEBUG] ${entry}`)
  console.log(`[IME-DEBUG] ${entry}`)
}

function DeviceCard({ device, onConnect }: { device: AdbDevice; onConnect: (serial: string) => void }) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    try {
      setStatus('rooting...')
      const res = await window.electronAPI.adbRoot(device.serial)
      setStatus(res.message)
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      logger.error('DeviceCard', 'adbRoot failed', err)
      setStatus('root failed')
    }
  }

  const handleRemount = async () => {
    try {
      setStatus('remounting...')
      const res = await window.electronAPI.adbRemount(device.serial)
      setStatus(res.message)
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      logger.error('DeviceCard', 'adbRemount failed', err)
      setStatus('remount failed')
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 hover:border-[var(--color-accent-green)] transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-accent-green)]/10">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{device.model}</p>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">{device.serial}</p>
        </div>
      </div>

      {status && (
        <p className="mb-3 rounded bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text-secondary)] truncate font-mono">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-orange)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-orange)]/90 transition-colors cursor-pointer"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-purple)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-purple)]/90 transition-colors cursor-pointer"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-green)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors cursor-pointer"
        >
          <Terminal size={13} />
          Connect
        </button>
      </div>
    </div>
  )
}

function ShellPanel({ shellId, serial, model, onClose, onReconnect }: { shellId: string; serial: string; model: string; onClose: () => void; onReconnect: () => void }) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<unknown>(null)
  const inputBuffer = useRef('')
  const cursorPos = useRef(0)
  const sessionActive = useRef(true)
  const composing = useRef(false)
  
  // Command history
  const commandHistory = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const currentInput = useRef('')
  
  // Search mode
  const searchMode = useRef(false)
  const searchQuery = useRef('')
  const searchResult = useRef('')

  useEffect(() => {
    if (!termRef.current) return

    let term: InstanceType<typeof import('@xterm/xterm').Terminal>
    let fitAddon: InstanceType<typeof import('@xterm/addon-fit').FitAddon>
    let promptTimer: ReturnType<typeof setTimeout> | null = null

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')

      term = new Terminal({
        fontSize: 14,
        fontFamily: "'Consolas', 'Microsoft YaHei', monospace",
        theme: {
          background: '#FFFFFF',
          foreground: '#0F172A',
          cursor: '#2563EB',
          cursorAccent: '#FFFFFF',
          selectionBackground: 'rgba(37, 99, 235, 0.2)',
          black: '#0F172A',
          red: '#DC2626',
          green: '#16A34A',
          yellow: '#CA8A04',
          blue: '#2563EB',
          magenta: '#9333EA',
          cyan: '#0891B2',
          white: '#F8FAFC',
          brightBlack: '#64748B',
          brightRed: '#EF4444',
          brightGreen: '#22C55E',
          brightYellow: '#EAB308',
          brightBlue: '#3B82F6',
          brightMagenta: '#A855F7',
          brightCyan: '#06B6D4',
          brightWhite: '#FFFFFF',
        },
        allowProposedApi: true,
      })
      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(termRef.current!)

      // Handle Ctrl+Insert (copy) and Shift+Insert (paste) at DOM level
      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        // Ctrl+Insert: copy selected text
        if (event.ctrlKey && event.key === 'Insert' && event.type === 'keydown') {
          const selection = term.getSelection()
          if (selection) {
            navigator.clipboard.writeText(selection)
          }
          return false
        }
        // Shift+Insert: paste from clipboard
        if (event.shiftKey && event.key === 'Insert' && event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (text) {
              inputBuffer.current += text
              cursorPos.current += text.length
              term.write(text)
            }
          })
          return false
        }
        return true
      })

      term.focus()
      fitAddon.fit()
      xtermRef.current = term

      // IME handling - track composition state
      const textarea = term.element?.querySelector('textarea')
      if (textarea) {
        textarea.addEventListener('compositionstart', () => {
          debugLog('compositionstart')
          composing.current = true
        })
        textarea.addEventListener('compositionend', (e) => {
          debugLog('compositionend', { data: e.data, composingBefore: composing.current })
          requestAnimationFrame(() => {
            debugLog('rAF: resetting composing to false')
            composing.current = false
          })
        })
      }

      const promptPrefix = ' \x1b[36m' + model + '\x1b[0m \x1b[32m$\x1b[0m '

      // 延迟显示欢迎信息，等待 ADB Shell 初始化完成
      setTimeout(() => {
        term.write('\x1b[2J\x1b[H') // 清屏
        term.write('\x1b[36m adb shell\x1b[0m connected to \x1b[33m' + serial + '\x1b[0m\r\n')
        term.write('\x1b[36m Device:\x1b[0m ' + model + '\x1b[0m\r\n\r\n')
        term.write(promptPrefix)
        inputBuffer.current = ''
        cursorPos.current = 0
      }, 100)
      
      sessionActive.current = true

      const writePrompt = () => {
        term.write('\r' + promptPrefix)
        if (inputBuffer.current) term.write(inputBuffer.current)
        cursorPos.current = inputBuffer.current.length
        term.scrollToBottom()
      }

      const clearInput = () => {
        const len = inputBuffer.current.length
        if (cursorPos.current < len) term.write('\x1b[' + (len - cursorPos.current) + 'C')
        for (let i = 0; i < len; i++) term.write('\b \b')
        inputBuffer.current = ''
        cursorPos.current = 0
      }

      // Load command history from file
      const loadHistory = async () => {
        try {
          const result = await window.electronAPI.loadHistory()
          if (result.success && result.history) {
            commandHistory.current = result.history
            logger.info('ShellPanel', 'History loaded:', { count: result.history.length })
          }
        } catch (err) {
          logger.error('ShellPanel', 'Failed to load history:', err)
        }
      }

      // Save command history to file
      const saveHistory = async () => {
        try {
          await window.electronAPI.saveHistory(commandHistory.current)
          logger.info('ShellPanel', 'History saved:', { count: commandHistory.current.length })
        } catch (err) {
          logger.error('ShellPanel', 'Failed to save history:', err)
        }
      }

      // Load history on init
      await loadHistory()

      // Search helper functions
      const findInHistory = (query: string): string => {
        if (!query) return ''
        for (let i = commandHistory.current.length - 1; i >= 0; i--) {
          if (commandHistory.current[i].includes(query)) {
            return commandHistory.current[i]
          }
        }
        return ''
      }

      const updateSearchDisplay = () => {
        term.write('\r\x1b[K(reverse-i-search)\'' + searchQuery.current + '\': ' + searchResult.current)
      }

      const enterSearchMode = () => {
        searchMode.current = true
        searchQuery.current = ''
        searchResult.current = ''
        term.write('\r\x1b[K(reverse-i-search)\': ')
      }

      const exitSearchMode = (execute: boolean = false) => {
        searchMode.current = false
        if (execute && searchResult.current) {
          inputBuffer.current = searchResult.current
          cursorPos.current = searchResult.current.length
          term.write('\r\n')
          window.electronAPI.adbShellWrite(shellId, searchResult.current + '\n')
          // Add to history
          const cmd = searchResult.current.trim()
          if (cmd && (commandHistory.current.length === 0 || commandHistory.current[commandHistory.current.length - 1] !== cmd)) {
            commandHistory.current.push(cmd)
            if (commandHistory.current.length > 300) commandHistory.current.shift()
            saveHistory()
          }
          historyIndex.current = -1
          currentInput.current = ''
          if (promptTimer) clearTimeout(promptTimer)
          promptTimer = setTimeout(writePrompt, 50)
        } else {
          term.write('\r\n' + promptPrefix + inputBuffer.current)
        }
        searchQuery.current = ''
        searchResult.current = ''
      }

      const deleteWordBack = () => {
        if (cursorPos.current === 0) return
        const before = inputBuffer.current.slice(0, cursorPos.current)
        const after = inputBuffer.current.slice(cursorPos.current)
        const trimmed = before.replace(/\S+\s*$/, '')
        const deleted = before.length - trimmed.length
        inputBuffer.current = trimmed + after
        cursorPos.current = trimmed.length
        term.write('\x1b[' + deleted + 'D')
        if (after) {
          term.write(after + ' '.repeat(deleted))
          term.write('\x1b[' + (after.length + deleted) + 'D' + after)
          term.write('\x1b[' + after.length + 'D')
        } else {
          term.write(' '.repeat(deleted) + '\x1b[' + deleted + 'D')
        }
      }

      const jumpWordLeft = () => {
        if (cursorPos.current === 0) return
        const before = inputBuffer.current.slice(0, cursorPos.current)
        const match = before.match(/\S+\s*$/)
        const jump = match ? match[0].length : 0
        cursorPos.current -= jump
        term.write('\x1b[' + jump + 'D')
      }

      const jumpWordRight = () => {
        const after = inputBuffer.current.slice(cursorPos.current)
        const match = after.match(/^\s*\S+/)
        const jump = match ? match[0].length : 0
        cursorPos.current += jump
        term.write('\x1b[' + jump + 'C')
      }

      term.onData((data) => {
        if (!sessionActive.current) return

        // DEBUG: 记录所有输入事件
        const hasChinese = /[\u4e00-\u9fff]/.test(data)
        if (hasChinese || composing.current) {
          debugLog('onData', {
            data: data.substring(0, 30),
            hex: Array.from(data).map(c => c.charCodeAt(0).toString(16)).join(' '),
            composing: composing.current,
            length: data.length,
          })
        }

        if (composing.current) return

        try {
          if (hasChinese) {
            debugLog('Processing Chinese input', { data, length: data.length })
            logger.info('Devices', `Chinese input detected: ${data.length} chars`)
          }

          // Search mode handling
          if (searchMode.current) {
            if (data === '\r') {  // Enter - execute matched command
              exitSearchMode(true)
              return
            }
            if (data === '\x1b') {  // Esc - cancel search
              exitSearchMode(false)
              return
            }
            if (data === '\x7f' || data === '\b') {  // Backspace
              if (searchQuery.current.length > 0) {
                searchQuery.current = searchQuery.current.slice(0, -1)
                searchResult.current = findInHistory(searchQuery.current)
                updateSearchDisplay()
              }
              return
            }
            if (data >= ' ') {
              searchQuery.current += data
              searchResult.current = findInHistory(searchQuery.current)
              updateSearchDisplay()
              return
            }
            return
          }

          // Ctrl+R - enter search mode
          if (data === '\x12') {
            enterSearchMode()
            return
          }

          // Ctrl+C - interrupt command
          if (data === '\x03') {
            window.electronAPI.adbShellWrite(shellId, '\x03')
            window.electronAPI.adbShellFlushStdin(shellId)
            term.write('^C\r\n' + promptPrefix)
            inputBuffer.current = ''
            cursorPos.current = 0
            if (promptTimer) clearTimeout(promptTimer)
            return
          }
          // Ctrl+A - home
          if (data === '\x01') { term.write('\x1b[' + cursorPos.current + 'D'); cursorPos.current = 0; return }
          // Ctrl+E - end
          if (data === '\x05') { const m = inputBuffer.current.length - cursorPos.current; if (m > 0) term.write('\x1b[' + m + 'C'); cursorPos.current = inputBuffer.current.length; return }
          // Ctrl+U - delete to start
          if (data === '\x15') { clearInput(); return }
          // Ctrl+K - delete to end
          if (data === '\x0b') {
            const del = inputBuffer.current.length - cursorPos.current
            for (let i = 0; i < del; i++) term.write(' ')
            term.write('\x1b[' + del + 'D')
            inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current)
            return
          }
          // Ctrl+W - delete word back
          if (data === '\x17') { deleteWordBack(); return }
          // Ctrl+L - clear screen
          if (data === '\x0c') { term.write('\x1b[2J\x1b[H\x1b[32m$\x1b[0m ' + inputBuffer.current); cursorPos.current = inputBuffer.current.length; return }
          // Ctrl+Left - jump word left
          if (data === '\x1b[1;5D') { jumpWordLeft(); return }
          // Ctrl+Right - jump word right
          if (data === '\x1b[1;5C') { jumpWordRight(); return }
          // Left arrow
          if (data === '\x1b[D') { if (cursorPos.current > 0) { cursorPos.current--; term.write('\x1b[D') }; return }
          // Right arrow
          if (data === '\x1b[C') { if (cursorPos.current < inputBuffer.current.length) { cursorPos.current++; term.write('\x1b[C') }; return }
          // Up arrow - history navigation
          if (data === '\x1b[A') {
            if (commandHistory.current.length === 0) return
            if (historyIndex.current === -1) {
              currentInput.current = inputBuffer.current
              historyIndex.current = commandHistory.current.length - 1
            } else if (historyIndex.current > 0) {
              historyIndex.current--
            }
            clearInput()
            const cmd = commandHistory.current[historyIndex.current]
            inputBuffer.current = cmd
            cursorPos.current = cmd.length
            term.write(cmd)
            return
          }
          // Down arrow - history navigation
          if (data === '\x1b[B') {
            if (historyIndex.current === -1) return
            if (historyIndex.current < commandHistory.current.length - 1) {
              historyIndex.current++
              clearInput()
              const cmd = commandHistory.current[historyIndex.current]
              inputBuffer.current = cmd
              cursorPos.current = cmd.length
              term.write(cmd)
            } else {
              historyIndex.current = -1
              clearInput()
              inputBuffer.current = currentInput.current
              cursorPos.current = currentInput.current.length
              term.write(currentInput.current)
            }
            return
          }
          // Home
          if (data === '\x1b[H') { term.write('\x1b[' + cursorPos.current + 'D'); cursorPos.current = 0; return }
          // End
          if (data === '\x1b[F') { const m = inputBuffer.current.length - cursorPos.current; if (m > 0) term.write('\x1b[' + m + 'C'); cursorPos.current = inputBuffer.current.length; return }
          // Enter
          if (data === '\r') {
            const cmd = inputBuffer.current.trim()
            logger.info('Devices', `Enter pressed, command: "${cmd}" (${cmd.length} chars)`)
            // Add to history (skip empty and consecutive duplicates)
            if (cmd && (commandHistory.current.length === 0 || commandHistory.current[commandHistory.current.length - 1] !== cmd)) {
              commandHistory.current.push(cmd)
              if (commandHistory.current.length > 300) {
                commandHistory.current.shift()
              }
              saveHistory()
            }
            historyIndex.current = -1
            currentInput.current = ''
            term.write('\r\n')
            window.electronAPI.adbShellWrite(shellId, inputBuffer.current + '\n')
            inputBuffer.current = ''
            cursorPos.current = 0
            if (promptTimer) clearTimeout(promptTimer)
            promptTimer = setTimeout(writePrompt, 50)
            return
          }
          // Backspace
          if (data === '\x7f' || data === '\b') {
            if (cursorPos.current === 0) return
            const before = inputBuffer.current.slice(0, cursorPos.current - 1)
            const after = inputBuffer.current.slice(cursorPos.current)
            inputBuffer.current = before + after
            cursorPos.current--
            term.write('\b' + after + ' ')
            term.write('\x1b[' + after.length + 'D')
            return
          }
          // Printable (including Chinese characters)
          if (data.length >= 1 && data !== '\x1b') {
            const before = inputBuffer.current.slice(0, cursorPos.current)
            const after = inputBuffer.current.slice(cursorPos.current)
            inputBuffer.current = before + data + after
            cursorPos.current += data.length
            term.write(data + after)
            if (after.length) term.write('\x1b[' + after.length + 'D')
            // 发送字符到 ADB shell
            window.electronAPI.adbShellWrite(shellId, data)
          }
        } catch (err) {
          logger.error('Devices', 'Error in onData', err)
        }
      })

      const handleData = (id: string, data: string) => {
        if (id === shellId) {
          if (promptTimer) clearTimeout(promptTimer)
          const formatted = data.split('\n').map(line => ' ' + line).join('\n')
          term.write(formatted)
          promptTimer = setTimeout(writePrompt, 30)
        }
      }
      const handleExit = (id: string) => {
        if (id === shellId) {
          debugLog('Shell EXIT received', { id, shellId, sessionActive: sessionActive.current })
          sessionActive.current = false
          if (promptTimer) clearTimeout(promptTimer)
          term.write('\r\n\x1b[31mDevice Disconnected\x1b[0m\r\n')
          term.write('\x1b[90mPress Enter or click Reconnect to retry.\x1b[0m\r\n')
        }
      }

      window.electronAPI.onShellData(handleData)
      window.electronAPI.onShellExit(handleExit)

      const resizeObs = new ResizeObserver(() => fitAddon.fit())
      resizeObs.observe(termRef.current!)

      return () => {
        if (promptTimer) clearTimeout(promptTimer)
        resizeObs.disconnect()
        term.dispose()
      }
    }

    let cleanup: (() => void) | undefined
    init().then((fn) => { cleanup = fn }).catch((err) => {
      logger.error('Devices', 'Terminal init failed', err)
    })

    return () => { cleanup?.() }
  }, [shellId, serial, model])

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 bg-[var(--color-card-bg)]">
        <span className="text-xs font-medium font-mono text-[var(--color-accent-green)]">adb -s {serial} shell</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onReconnect}
            className="rounded p-1 hover:bg-[var(--color-sidebar-hover)] cursor-pointer text-[var(--color-text-secondary)]"
            title="Reconnect"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { window.electronAPI.adbShellKill(shellId); onClose() }}
            className="rounded p-1 hover:bg-[var(--color-accent-red)] cursor-pointer text-[var(--color-text-secondary)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div ref={termRef} className="flex-1 bg-[var(--color-background)]" />
    </div>
  )
}

function AdbNotFound({ onInstall, installing }: { onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 py-16">
      <AlertTriangle size={36} className="mb-3 text-[var(--color-accent-orange)]" />
      <p className="text-sm font-medium text-[var(--color-text-primary)]">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 disabled:opacity-50 cursor-pointer"
      >
        <Download size={16} className={installing ? 'animate-bounce' : ''} />
        {installing ? '正在安装...' : '一键安装 ADB'}
      </button>
    </div>
  )
}

function Devices() {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [shell, setShell] = useState<{ id: string; serial: string; model: string } | null>(null)

  const checkAndRefresh = async () => {
    setLoading(true)
    logger.info('Devices', 'Starting ADB check...')
    try {
      const { available } = await window.electronAPI.adbCheck()
      logger.info('Devices', 'ADB check result:', { available })
      setAdbAvailable(available)
      if (available) {
        logger.info('Devices', 'Fetching devices...')
        const list = await window.electronAPI.adbDevices()
        logger.info('Devices', 'Devices found:', { count: list.length, devices: list })
        setDevices(list)
      }
    } catch (err) {
      logger.error('Devices', 'ADB check failed:', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    logger.info('Devices', 'Component mounted, scheduling ADB check...')
    const timer = setTimeout(() => {
      logger.info('Devices', 'Executing ADB check...')
      checkAndRefresh()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    try {
      setInstalling(true)
      const res = await window.electronAPI.adbInstall()
      setInstalling(false)
      if (res.success) {
        setAdbAvailable(true)
        checkAndRefresh()
      }
    } catch (err) {
      logger.error('Devices', 'ADB install failed', err)
      setInstalling(false)
    }
  }

  const handleConnect = async (serial: string) => {
    try {
      const id = await window.electronAPI.adbShellStart(serial)
      const device = devices.find((d) => d.serial === serial)
      if (id) setShell({ id, serial, model: device?.model || serial })
    } catch (err) {
      logger.error('Devices', 'Shell start failed', err)
    }
  }

  const handleReconnect = async () => {
    if (!shell) return
    try {
      const newId = await window.electronAPI.adbShellReconnect(shell.serial, shell.id)
      if (newId) setShell({ ...shell, id: newId })
    } catch (err) {
      logger.error('Devices', 'Shell reconnect failed', err)
    }
  }

  if (adbAvailable === null) {
    return <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-secondary)]">检测中...</div>
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
        </p>
        <button
          onClick={checkAndRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-bg)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新设备
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <DeviceCard key={d.serial} device={d} onConnect={handleConnect} />
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] py-16">
          <HardDrive size={32} className="mb-3 text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && (
        <ShellPanel shellId={shell.id} serial={shell.serial} model={shell.model} onClose={() => setShell(null)} onReconnect={handleReconnect} />
      )}
    </div>
  )
}

export default Devices
