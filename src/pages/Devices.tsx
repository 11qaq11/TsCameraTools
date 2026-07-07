import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, X, Download, AlertTriangle } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import type { AdbDevice } from '../types'
import { logger } from '../utils/logger'

function DeviceCard({ device, onConnect }: { device: AdbDevice; onConnect: (serial: string) => void }) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    setStatus('rooting...')
    const res = await window.electronAPI.adbRoot(device.serial)
    setStatus(res.message)
    setTimeout(() => setStatus(''), 3000)
  }

  const handleRemount = async () => {
    setStatus('remounting...')
    const res = await window.electronAPI.adbRemount(device.serial)
    setStatus(res.message)
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5 hover:border-[#22C55E] transition-all duration-300 hover:shadow-lg hover:shadow-[#22C55E]/10">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{device.model}</p>
          <p className="text-xs text-[#94A3B8] font-mono">{device.serial}</p>
        </div>
      </div>

      {status && (
        <p className="mb-3 rounded bg-[#0F172A] px-2 py-1 text-xs text-[#94A3B8] truncate font-mono">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-medium text-white hover:bg-[#F59E0B]/90 transition-colors cursor-pointer"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3 py-2 text-xs font-medium text-white hover:bg-[#8B5CF6]/90 transition-colors cursor-pointer"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#22C55E] px-3 py-2 text-xs font-medium text-white hover:bg-[#22C55E]/90 transition-colors cursor-pointer"
        >
          <Terminal size={13} />
          Connect
        </button>
      </div>
    </div>
  )
}

function ShellPanel({ shellId, serial, model, onClose }: { shellId: string; serial: string; model: string; onClose: () => void }) {
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
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
        theme: {
          background: '#0F172A',
          foreground: '#F8FAFC',
          cursor: '#22C55E',
          cursorAccent: '#0F172A',
          selectionBackground: '#22C55E33',
          black: '#1E293B',
          red: '#EF4444',
          green: '#22C55E',
          yellow: '#F59E0B',
          blue: '#3B82F6',
          magenta: '#8B5CF6',
          cyan: '#06B6D4',
          white: '#F8FAFC',
          brightBlack: '#475569',
          brightRed: '#FCA5A5',
          brightGreen: '#86EFAC',
          brightYellow: '#FDE68A',
          brightBlue: '#93C5FD',
          brightMagenta: '#C4B5FD',
          brightCyan: '#67E8F9',
          brightWhite: '#FFFFFF',
        },
      })
      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(termRef.current!)
      term.focus()
      fitAddon.fit()
      xtermRef.current = term

      // Copy on select
      term.onSelectionChange(() => {
        const sel = term.getSelection()
        if (sel) {
          navigator.clipboard.writeText(sel)
        }
      })

      // IME handling - track composition state
      const textarea = term.element?.querySelector('textarea')
      if (textarea) {
        textarea.addEventListener('compositionstart', () => { composing.current = true })
        textarea.addEventListener('compositionend', (e: CompositionEvent) => {
          composing.current = false
          // compositionend 时直接处理输入，避免 onData 重复触发
          if (e.data) {
            const before = inputBuffer.current.slice(0, cursorPos.current)
            const after = inputBuffer.current.slice(cursorPos.current)
            inputBuffer.current = before + e.data + after
            cursorPos.current += e.data.length
            term.write(e.data + after)
            if (after.length) term.write('\x1b[' + after.length + 'D')
          }
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
        if (composing.current) return
        
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
        
        // Ctrl+C
        if (data === '\x03') {
          window.electronAPI.adbShellWrite(shellId, '\x03')
          window.electronAPI.adbShellFlushStdin(shellId)
          term.write('^C\r\n' + promptPrefix)
          inputBuffer.current = ''
          cursorPos.current = 0
          if (promptTimer) clearTimeout(promptTimer)
          return
        }
        // Ctrl+V
        if (data === '\x16') {
          navigator.clipboard.readText().then((t) => {
            if (t) { inputBuffer.current += t; cursorPos.current += t.length; term.write(t) }
          })
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
        // Printable
        if (data >= ' ') {
          const before = inputBuffer.current.slice(0, cursorPos.current)
          const after = inputBuffer.current.slice(cursorPos.current)
          inputBuffer.current = before + data + after
          cursorPos.current++
          term.write(data + after)
          if (after.length) term.write('\x1b[' + after.length + 'D')
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
          sessionActive.current = false
          if (promptTimer) clearTimeout(promptTimer)
          term.write('\r\n\x1b[31mDevice Disconnected\x1b[0m\r\n')
          term.write('\x1b[90mPlease refresh devices and reconnect.\x1b[0m\r\n')
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
    init().then((fn) => { cleanup = fn })

    return () => { cleanup?.() }
  }, [shellId, serial, model])

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-[#334155] overflow-hidden" style={{ background: '#0F172A' }}>
      <div className="flex items-center justify-between border-b border-[#334155] px-4 py-2" style={{ background: '#1E293B' }}>
        <span className="text-xs font-medium font-mono" style={{ color: '#22C55E' }}>adb -s {serial} shell</span>
        <button
          onClick={() => { window.electronAPI.adbShellKill(shellId); onClose() }}
          className="rounded p-1 hover:bg-[#EF4444] cursor-pointer"
          style={{ color: '#94A3B8' }}
        >
          <X size={14} />
        </button>
      </div>
      <div ref={termRef} className="flex-1" style={{ background: '#0F172A' }} />
    </div>
  )
}

function AdbNotFound({ onInstall, installing }: { onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#F59E0B] bg-[#F59E0B]/10 py-16">
      <AlertTriangle size={36} className="mb-3 text-[#F59E0B]" />
      <p className="text-sm font-medium text-white">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-[#94A3B8]">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-[#22C55E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#22C55E]/90 disabled:opacity-50 cursor-pointer"
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
    setInstalling(true)
    const res = await window.electronAPI.adbInstall()
    setInstalling(false)
    if (res.success) {
      setAdbAvailable(true)
      checkAndRefresh()
    }
  }

  const handleConnect = async (serial: string) => {
    const id = await window.electronAPI.adbShellStart(serial)
    const device = devices.find((d) => d.serial === serial)
    if (id) setShell({ id, serial, model: device?.model || serial })
  }

  if (adbAvailable === null) {
    return <div className="flex items-center justify-center py-16 text-sm text-[#94A3B8]">检测中...</div>
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#94A3B8]">
          {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
        </p>
        <button
          onClick={checkAndRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-sm font-medium text-white hover:bg-[#334155] disabled:opacity-50 cursor-pointer"
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
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#334155] py-16">
          <HardDrive size={32} className="mb-3 text-[#94A3B8]" />
          <p className="text-sm text-[#94A3B8]">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && (
        <ShellPanel shellId={shell.id} serial={shell.serial} model={shell.model} onClose={() => setShell(null)} />
      )}
    </div>
  )
}

export default Devices
