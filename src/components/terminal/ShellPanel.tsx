import { useEffect, useRef } from 'react'
import { RefreshCw, X } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import { logger } from '../../utils/logger'

interface ShellPanelProps {
  type: 'adb' | 'local'
  shellId: string
  serial?: string
  model?: string
  onClose: () => void
  onReconnect: () => void
}

const debugLog = (msg: string, data?: Record<string, unknown>) => {
  const entry = data ? `${msg} ${JSON.stringify(data)}` : msg
  window.electronAPI?.writeLog?.(`[IME-DEBUG] ${entry}`)
  console.log(`[IME-DEBUG] ${entry}`)
}

export default function ShellPanel({ type, shellId, serial, model, onClose, onReconnect }: ShellPanelProps) {
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

  const title = type === 'adb' && serial ? `adb -s ${serial} shell` : 'Local Terminal (cmd)'

  const writeShell = (data: string) => {
    if (type === 'adb') window.electronAPI.adbShellWrite(shellId, data)
    else window.electronAPI.localShellWrite(shellId, data)
  }

  const flushStdin = () => {
    if (type === 'adb') window.electronAPI.adbShellFlushStdin(shellId)
    else window.electronAPI.localShellFlushStdin(shellId)
  }

  const killShell = () => {
    if (type === 'adb') window.electronAPI.adbShellKill(shellId)
    else window.electronAPI.localShellKill(shellId)
  }

  const displayModel = model || serial || 'local'

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

      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'Insert' && event.type === 'keydown') {
          const selection = term.getSelection()
          if (selection) navigator.clipboard.writeText(selection)
          return false
        }
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

      // IME composition tracking
      const textarea = term.element?.querySelector('textarea')
      if (textarea) {
        textarea.addEventListener('compositionstart', () => {
          debugLog('compositionstart')
          composing.current = true
        })
        textarea.addEventListener('compositionend', (e) => {
          debugLog('compositionend', { data: e.data, composingBefore: composing.current })
          requestAnimationFrame(() => {
            composing.current = false
          })
        })
      }

      const promptPrefix = type === 'adb'
        ? ' \x1b[36m' + displayModel + '\x1b[0m \x1b[32m$\x1b[0m '
        : ' \x1b[32m$\x1b[0m '

      setTimeout(() => {
        term.write('\x1b[2J\x1b[H')
        if (type === 'adb') {
          term.write('\x1b[36m adb shell\x1b[0m connected to \x1b[33m' + serial + '\x1b[0m\r\n')
          term.write('\x1b[36m Device:\x1b[0m ' + displayModel + '\x1b[0m\r\n\r\n')
        } else {
          term.write('\x1b[36m Local Terminal\x1b[0m\r\n\r\n')
        }
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

      const saveHistory = async () => {
        try {
          await window.electronAPI.saveHistory(commandHistory.current)
        } catch (err) {
          logger.error('ShellPanel', 'Failed to save history:', err)
        }
      }

      await loadHistory()

      const findInHistory = (query: string): string => {
        if (!query) return ''
        for (let i = commandHistory.current.length - 1; i >= 0; i--) {
          if (commandHistory.current[i].includes(query)) return commandHistory.current[i]
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

      const exitSearchMode = (execute = false) => {
        searchMode.current = false
        if (execute && searchResult.current) {
          inputBuffer.current = searchResult.current
          cursorPos.current = searchResult.current.length
          term.write('\r\n')
          writeShell(searchResult.current + '\n')
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
            logger.info('ShellPanel', `Chinese input: ${data.length} chars`)
          }

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

          if (data === '\x12') { enterSearchMode(); return }

          if (data === '\x03') {
            writeShell('\x03')
            flushStdin()
            term.write('^C\r\n' + promptPrefix)
            inputBuffer.current = ''
            cursorPos.current = 0
            if (promptTimer) clearTimeout(promptTimer)
            return
          }
          if (data === '\x01') { term.write('\x1b[' + cursorPos.current + 'D'); cursorPos.current = 0; return }
          if (data === '\x05') { const m = inputBuffer.current.length - cursorPos.current; if (m > 0) term.write('\x1b[' + m + 'C'); cursorPos.current = inputBuffer.current.length; return }
          if (data === '\x15') { clearInput(); return }
          if (data === '\x0b') {
            const del = inputBuffer.current.length - cursorPos.current
            for (let i = 0; i < del; i++) term.write(' ')
            term.write('\x1b[' + del + 'D')
            inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current)
            return
          }
          if (data === '\x17') { deleteWordBack(); return }
          if (data === '\x0c') { term.write('\x1b[2J\x1b[H\x1b[32m$\x1b[0m ' + inputBuffer.current); cursorPos.current = inputBuffer.current.length; return }
          if (data === '\x1b[1;5D') { jumpWordLeft(); return }
          if (data === '\x1b[1;5C') { jumpWordRight(); return }
          if (data === '\x1b[D') { if (cursorPos.current > 0) { cursorPos.current--; term.write('\x1b[D') }; return }
          if (data === '\x1b[C') { if (cursorPos.current < inputBuffer.current.length) { cursorPos.current++; term.write('\x1b[C') }; return }
          if (data === '\x1b[A') {
            if (commandHistory.current.length === 0) return
            if (historyIndex.current === -1) {
              currentInput.current = inputBuffer.current
              historyIndex.current = commandHistory.current.length - 1
            } else if (historyIndex.current > 0) historyIndex.current--
            clearInput()
            const cmd = commandHistory.current[historyIndex.current]
            inputBuffer.current = cmd
            cursorPos.current = cmd.length
            term.write(cmd)
            return
          }
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
          if (data === '\x1b[H') { term.write('\x1b[' + cursorPos.current + 'D'); cursorPos.current = 0; return }
          if (data === '\x1b[F') { const m = inputBuffer.current.length - cursorPos.current; if (m > 0) term.write('\x1b[' + m + 'C'); cursorPos.current = inputBuffer.current.length; return }
          if (data === '\r') {
            const cmd = inputBuffer.current.trim()
            if (cmd && (commandHistory.current.length === 0 || commandHistory.current[commandHistory.current.length - 1] !== cmd)) {
              commandHistory.current.push(cmd)
              if (commandHistory.current.length > 300) commandHistory.current.shift()
              saveHistory()
            }
            historyIndex.current = -1
            currentInput.current = ''
            term.write('\r\n')
            writeShell(inputBuffer.current + '\n')
            inputBuffer.current = ''
            cursorPos.current = 0
            if (promptTimer) clearTimeout(promptTimer)
            promptTimer = setTimeout(writePrompt, 50)
            return
          }
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
          if (data.length >= 1 && data !== '\x1b') {
            const before = inputBuffer.current.slice(0, cursorPos.current)
            const after = inputBuffer.current.slice(cursorPos.current)
            inputBuffer.current = before + data + after
            cursorPos.current += data.length
            term.write(data + after)
            if (after.length) term.write('\x1b[' + after.length + 'D')
            writeShell(data)
          }
        } catch (err) {
          logger.error('ShellPanel', 'Error in onData', err)
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
          debugLog('Shell EXIT received', { id, shellId })
          sessionActive.current = false
          if (promptTimer) clearTimeout(promptTimer)
          term.write('\r\n\x1b[31mDisconnected\x1b[0m\r\n')
          term.write('\x1b[90mPress Enter or click Reconnect to retry.\x1b[0m\r\n')
        }
      }

      window.electronAPI.onShellData(type, handleData)
      window.electronAPI.onShellExit(type, handleExit)

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
      logger.error('ShellPanel', 'Terminal init failed', err)
    })

    return () => { cleanup?.() }
  }, [shellId, type, serial, displayModel])

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 bg-[var(--color-card-bg)]">
        <span className="text-xs font-medium font-mono text-[var(--color-accent-green)]">{title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onReconnect}
            className="rounded p-1 hover:bg-[var(--color-sidebar-hover)] cursor-pointer text-[var(--color-text-secondary)]"
            title="Reconnect"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { killShell(); onClose() }}
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
