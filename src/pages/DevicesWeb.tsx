import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, X, Download, AlertTriangle, LogOut, Maximize2, Minimize2, Copy, Clipboard } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import { fetchWithAuth } from '../utils/auth'

interface AdbDevice {
  serial: string
  model: string
  status: 'device' | 'offline' | 'unauthorized'
}

function DeviceCard({ device, onConnect, connecting }: { 
  device: AdbDevice
  onConnect: (serial: string) => void
  connecting: boolean
}) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    setStatus('rooting...')
    const res = await fetchWithAuth(`/api/adb/root/${device.serial}`, { method: 'POST' })
    const data = await res.json() as { success: boolean; message: string }
    setStatus(data.message)
    setTimeout(() => setStatus(''), 3000)
  }

  const handleRemount = async () => {
    setStatus('remounting...')
    const res = await fetchWithAuth(`/api/adb/remount/${device.serial}`, { method: 'POST' })
    const data = await res.json() as { success: boolean; message: string }
    setStatus(data.message)
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{device.model}</p>
          <p className="text-xs text-gray-500 font-mono">{device.serial}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          device.status === 'device' ? 'bg-green-100 text-green-700' :
          device.status === 'unauthorized' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {device.status === 'device' ? '在线' : device.status === 'unauthorized' ? '未授权' : '离线'}
        </span>
      </div>

      {status && (
        <p className="mb-3 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 truncate">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          disabled={connecting || device.status !== 'device'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Terminal size={13} />
          {connecting ? '连接中...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

function ShellPanel({ shellId, serial, model, onClose, socket }: { 
  shellId: string
  serial: string
  model: string
  onClose: () => void
  socket: ReturnType<typeof useSocket>['socket']
}) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<unknown>(null)
  const inputBuffer = useRef('')
  const cursorPos = useRef(0)
  const sessionActive = useRef(true)
  const composing = useRef(false)
  const [maximized, setMaximized] = useState(false)
  
  // Command history
  const commandHistory = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const currentInput = useRef('')
  
  // Search mode
  const searchMode = useRef(false)
  const searchQuery = useRef('')
  const searchResult = useRef('')

  const loadHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem('adb_command_history')
      if (saved) commandHistory.current = JSON.parse(saved)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }, [])

  const saveHistory = useCallback(() => {
    try {
      localStorage.setItem('adb_command_history', JSON.stringify(commandHistory.current))
    } catch (err) {
      console.error('Failed to save history:', err)
    }
  }, [])

  useEffect(() => {
    if (!termRef.current || !socket) return

    let term: InstanceType<typeof import('@xterm/xterm').Terminal>
    let fitAddon: InstanceType<typeof import('@xterm/addon-fit').FitAddon>
    let promptTimer: ReturnType<typeof setTimeout> | null = null

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')

      term = new Terminal({
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
        theme: {
          background: '#1a1b26',
          foreground: '#c0caf5',
          cursor: '#c0caf5',
          cursorAccent: '#1a1b26',
          selectionBackground: '#33467c',
          black: '#15161e',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#a9b1d6',
          brightBlack: '#414868',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c0caf5',
        },
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 10000,
        tabStopWidth: 4,
      })
      fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(termRef.current!)
      term.focus()
      fitAddon.fit()
      xtermRef.current = term

      // IME handling
      const textarea = term.element?.querySelector('textarea')
      if (textarea) {
        textarea.addEventListener('compositionstart', () => { composing.current = true })
        textarea.addEventListener('compositionend', () => {
          setTimeout(() => { composing.current = false }, 50)
        })
      }

      // Welcome message
      term.writeln('\x1b[1;34m╔══════════════════════════════════════════════════════════════╗\x1b[0m')
      term.writeln('\x1b[1;34m║\x1b[0m  \x1b[1;36mADB Shell Terminal\x1b[0m                                      \x1b[1;34m║\x1b[0m')
      term.writeln('\x1b[1;34m║\x1b[0m  \x1b[33mDevice:\x1b[0m ' + model.padEnd(50) + '\x1b[1;34m║\x1b[0m')
      term.writeln('\x1b[1;34m║\x1b[0m  \x1b[33mSerial:\x1b[0m ' + serial.padEnd(50) + '\x1b[1;34m║\x1b[0m')
      term.writeln('\x1b[1;34m╚══════════════════════════════════════════════════════════════╝\x1b[0m')
      term.writeln('')
      term.writeln('  \x1b[90mType "help" for available commands. Ctrl+R for history search.\x1b[0m')
      term.writeln('')

      const promptPrefix = '\x1b[1;32m' + model + '\x1b[0m \x1b[1;34m$\x1b[0m '

      term.write(promptPrefix)
      inputBuffer.current = ''
      cursorPos.current = 0
      sessionActive.current = true

      loadHistory()

      const writePrompt = () => {
        term.write('\r\x1b[K' + promptPrefix)
        if (inputBuffer.current) term.write(inputBuffer.current)
        cursorPos.current = inputBuffer.current.length
      }

      const clearInput = () => {
        const len = inputBuffer.current.length
        if (cursorPos.current < len) term.write('\x1b[' + (len - cursorPos.current) + 'C')
        for (let i = 0; i < len; i++) term.write('\b \b')
        inputBuffer.current = ''
        cursorPos.current = 0
      }

      // Search helpers
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
        term.write('\r\x1b[K\x1b[33m(reverse-i-search)\x1b[0m\x1b[36m\'' + searchQuery.current + '\'\x1b[0m: ' + searchResult.current)
      }

      const enterSearchMode = () => {
        searchMode.current = true
        searchQuery.current = ''
        searchResult.current = ''
        term.write('\r\x1b[K\x1b[33m(reverse-i-search)\x1b[0m\x1b[36m\'\'\x1b[0m: ')
      }

      const exitSearchMode = (execute: boolean = false) => {
        searchMode.current = false
        if (execute && searchResult.current) {
          inputBuffer.current = searchResult.current
          cursorPos.current = searchResult.current.length
          term.write('\r\n')
          socket.emit('shell:input', { sessionId: shellId, input: searchResult.current + '\n' })
          const cmd = searchResult.current.trim()
          if (cmd && (commandHistory.current.length === 0 || commandHistory.current[commandHistory.current.length - 1] !== cmd)) {
            commandHistory.current.push(cmd)
            if (commandHistory.current.length > 500) commandHistory.current.shift()
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

      // Handle input
      term.onData((data) => {
        if (!sessionActive.current) return
        if (composing.current) return
        
        // Search mode
        if (searchMode.current) {
          if (data === '\r') { exitSearchMode(true); return }
          if (data === '\x1b') { exitSearchMode(false); return }
          if (data === '\x7f' || data === '\b') {
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
        
        // Ctrl+R
        if (data === '\x12') { enterSearchMode(); return }
        
        // Ctrl+C
        if (data === '\x03') {
          const sel = term.getSelection()
          if (sel) { navigator.clipboard.writeText(sel); return }
          socket.emit('shell:input', { sessionId: shellId, input: '\x03' })
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
        if (data === '\x0c') { term.write('\x1b[2J\x1b[H' + promptPrefix + inputBuffer.current); cursorPos.current = inputBuffer.current.length; return }
        // Ctrl+Left
        if (data === '\x1b[1;5D') { jumpWordLeft(); return }
        // Ctrl+Right
        if (data === '\x1b[1;5C') { jumpWordRight(); return }
        // Left arrow
        if (data === '\x1b[D') { if (cursorPos.current > 0) { cursorPos.current--; term.write('\x1b[D') }; return }
        // Right arrow
        if (data === '\x1b[C') { if (cursorPos.current < inputBuffer.current.length) { cursorPos.current++; term.write('\x1b[C') }; return }
        // Up arrow - history
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
        // Down arrow - history
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
          if (cmd && (commandHistory.current.length === 0 || commandHistory.current[commandHistory.current.length - 1] !== cmd)) {
            commandHistory.current.push(cmd)
            if (commandHistory.current.length > 500) commandHistory.current.shift()
            saveHistory()
          }
          historyIndex.current = -1
          currentInput.current = ''
          term.write('\r\n')
          socket.emit('shell:input', { sessionId: shellId, input: inputBuffer.current + '\n' })
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

      // Socket events
      const handleOutput = (data: { sessionId: string; data: string }) => {
        if (data.sessionId === shellId) {
          if (promptTimer) clearTimeout(promptTimer)
          term.write(data.data)
          promptTimer = setTimeout(writePrompt, 30)
        }
      }

      const handleExit = (data: { sessionId: string; code: number | null }) => {
        if (data.sessionId === shellId) {
          sessionActive.current = false
          if (promptTimer) clearTimeout(promptTimer)
          term.writeln('')
          term.writeln('\x1b[1;31m╔══════════════════════════════════════════════════════════════╗\x1b[0m')
          term.writeln('\x1b[1;31m║\x1b[0m  \x1b[1;33mSession Ended\x1b[0m                                              \x1b[1;31m║\x1b[0m')
          term.writeln('\x1b[1;31m║\x1b[0m  \x1b[90mDevice disconnected. Please refresh and reconnect.\x1b[0m         \x1b[1;31m║\x1b[0m')
          term.writeln('\x1b[1;31m╚══════════════════════════════════════════════════════════════╝\x1b[0m')
        }
      }

      socket.on('shell:output', handleOutput)
      socket.on('shell:exit', handleExit)

      const resizeObs = new ResizeObserver(() => fitAddon.fit())
      resizeObs.observe(termRef.current!)

      return () => {
        if (promptTimer) clearTimeout(promptTimer)
        resizeObs.disconnect()
        socket.off('shell:output', handleOutput)
        socket.off('shell:exit', handleExit)
        term.dispose()
      }
    }

    let cleanup: (() => void) | undefined
    init().then((fn) => { cleanup = fn })

    return () => { cleanup?.() }
  }, [shellId, serial, model, socket, loadHistory, saveHistory])

  const handleCopy = () => {
    const term = xtermRef.current as { getSelection?: () => string }
    if (term?.getSelection) {
      navigator.clipboard.writeText(term.getSelection())
    }
  }

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText()
    if (text && socket) {
      socket.emit('shell:input', { sessionId: shellId, input: text })
    }
  }

  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 overflow-hidden shadow-lg transition-all ${
      maximized ? 'fixed inset-4 z-50' : 'flex-1 min-h-0'
    }`}>
      {/* Terminal Header - cmder style */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer" onClick={onClose}></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 cursor-pointer" onClick={() => setMaximized(!maximized)}></div>
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 cursor-pointer"></div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Terminal size={14} className="text-blue-400" />
            <span className="text-sm font-medium text-gray-200">
              ADB Shell
            </span>
            <span className="text-xs text-gray-500">—</span>
            <span className="text-xs font-mono text-gray-400">{serial}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
            title="复制"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handlePaste}
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
            title="粘贴"
          >
            <Clipboard size={14} />
          </button>
          <button
            onClick={() => setMaximized(!maximized)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
            title={maximized ? "最小化" : "最大化"}
          >
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => { socket?.emit('shell:kill', { sessionId: shellId }); onClose() }}
            className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {/* Terminal Body */}
      <div ref={termRef} className="flex-1" style={{ background: '#1a1b26' }} />
      {/* Terminal Footer - Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            <span className="text-green-400">●</span> Connected
          </span>
          <span className="text-xs text-gray-500">
            History: {commandHistory.current.length} commands
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">Ctrl+R: Search</span>
          <span className="text-xs text-gray-500">Ctrl+C: Cancel</span>
        </div>
      </div>
    </div>
  )
}

function AdbNotFound({ onInstall, installing }: { onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-16">
      <AlertTriangle size={36} className="mb-3 text-amber-500" />
      <p className="text-sm font-medium text-gray-900">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-gray-500">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Download size={16} className={installing ? 'animate-bounce' : ''} />
        {installing ? '正在安装...' : '一键安装 ADB'}
      </button>
    </div>
  )
}

function Devices() {
  const { user, logout } = useAuth()
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [shell, setShell] = useState<{ id: string; serial: string; model: string } | null>(null)

  const { socket, connected } = useSocket()

  const checkAndRefresh = async () => {
    setLoading(true)
    try {
      const checkRes = await fetchWithAuth('/api/adb/check')
      const checkData = await checkRes.json() as { available: boolean }
      setAdbAvailable(checkData.available)

      if (checkData.available) {
        const devicesRes = await fetchWithAuth('/api/adb/devices')
        const devicesData = await devicesRes.json() as { devices: AdbDevice[] }
        setDevices(devicesData.devices)
      }
    } catch (err) {
      console.error('ADB check failed:', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    checkAndRefresh()
  }, [])

  const handleInstall = async () => {
    setInstalling(true)
    setTimeout(() => {
      setInstalling(false)
      setAdbAvailable(true)
      checkAndRefresh()
    }, 2000)
  }

  const handleConnect = async (serial: string) => {
    if (!socket) {
      alert('WebSocket 未连接，请等待连接后重试')
      return
    }
    if (!connected) {
      alert('服务器未就绪，请稍后重试')
      return
    }
    
    setConnecting(true)
    const device = devices.find((d) => d.serial === serial)
    const model = device?.model || serial

    socket.emit('shell:start', { serial, userId: user?.id })

    const handleStarted = (data: { sessionId: string; serial: string }) => {
      setShell({ id: data.sessionId, serial, model })
      setConnecting(false)
      socket.off('shell:started', handleStarted)
    }

    socket.once('shell:started', handleStarted)
    
    // Timeout after 5 seconds
    setTimeout(() => {
      setConnecting(false)
      socket.off('shell:started', handleStarted)
    }, 5000)
  }

  if (adbAvailable === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">检测 ADB...</span>
      </div>
    )
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
          </p>
          {user && (
            <p className="text-xs text-gray-400 mt-1">欢迎, {user.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-500">{connected ? '已连接' : '未连接'}</span>
          </div>
          <button
            onClick={checkAndRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新设备
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <DeviceCard key={d.serial} device={d} onConnect={handleConnect} connecting={connecting} />
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
          <HardDrive size={32} className="mb-3 text-gray-400" />
          <p className="text-sm text-gray-500">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && socket && (
        <ShellPanel 
          shellId={shell.id} 
          serial={shell.serial} 
          model={shell.model} 
          onClose={() => setShell(null)}
          socket={socket}
        />
      )}
    </div>
  )
}

export default Devices
