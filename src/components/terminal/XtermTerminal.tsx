import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'
import { logger } from '../../utils/logger'

interface XtermTerminalProps {
  type: 'adb' | 'local'
  serial?: string
  onClose: () => void
}

export default function XtermTerminal({ type, serial, onClose }: XtermTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<InstanceType<typeof import('@xterm/xterm').Terminal> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const resizeObsRef = useRef<ResizeObserver | null>(null)
  const intersectionObsRef = useRef<IntersectionObserver | null>(null)
  const visibilityHandlerRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'disconnected'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const connecting = useRef(false)
  const mounted = useRef(true)

  const cleanup = useCallback(() => {
    if (resizeObsRef.current) {
      resizeObsRef.current.disconnect()
      resizeObsRef.current = null
    }
    if (intersectionObsRef.current) {
      intersectionObsRef.current.disconnect()
      intersectionObsRef.current = null
    }
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current)
      visibilityHandlerRef.current = null
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
    if (xtermRef.current) {
      xtermRef.current.dispose()
      xtermRef.current = null
    }
  }, [])

  const connect = useCallback(async () => {
    if (connecting.current) return
    connecting.current = true

    cleanup()
    setStatus('loading')
    logger.info('XtermTerminal', `Connecting: type=${type}, serial=${serial || 'N/A'}`)

    try {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')

      if (!mounted.current) return

      const term = new Terminal({
        fontSize: 14,
        fontFamily: "'Consolas', 'Microsoft YaHei', monospace",
        theme: {
          background: '#F0F7FF',
          foreground: '#1E3A5F',
          cursor: '#3B82F6',
          cursorAccent: '#FFFFFF',
          selectionBackground: '#BFDBFE',
          black: '#1E3A5F',
          red: '#DC2626',
          green: '#16A34A',
          yellow: '#CA8A04',
          blue: '#3B82F6',
          magenta: '#9333EA',
          cyan: '#0891B2',
          white: '#F0F7FF',
          brightBlack: '#64748B',
          brightRed: '#EF4444',
          brightGreen: '#22C55E',
          brightYellow: '#EAB308',
          brightBlue: '#60A5FA',
          brightMagenta: '#A855F7',
          brightCyan: '#06B6D4',
          brightWhite: '#FFFFFF',
        },
        allowProposedApi: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      if (termRef.current) {
        term.open(termRef.current)
        fitAddon.fit()
      }

      xtermRef.current = term

      // WebSocket connection - in dev mode, connect to backend (port 3000)
      // In production, connect to same host (frontend served from Express)
      const isDev = import.meta.env.DEV
      const wsHost = isDev ? (import.meta.env.VITE_API_HOST || 'localhost') : window.location.hostname
      const wsPort = isDev ? (import.meta.env.VITE_API_PORT || '3000') : window.location.port || '3000'
      const wsUrl = `ws://${wsHost}:${wsPort}/terminal?type=${type}${serial ? `&serial=${serial}` : ''}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        logger.info('XtermTerminal', 'WebSocket connected')
        setStatus('ready')
        connecting.current = false

        // Send initial size
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          switch (msg.type) {
            case 'output':
              term.write(msg.data)
              break
            case 'exit':
              logger.info('XtermTerminal', `Terminal exited: code=${msg.exitCode}`)
              setStatus('disconnected')
              term.write('\r\n\x1b[31mTerminal exited\x1b[0m\r\n')
              break
            case 'ready':
              logger.info('XtermTerminal', `Session ready: pid=${msg.pid}`)
              break
            case 'error':
              logger.error('XtermTerminal', `Terminal error: ${msg.message}`)
              setErrorMsg(msg.message || 'Terminal error')
              setStatus('error')
              break
          }
        } catch {
          // Raw data
          term.write(event.data)
        }
      }

      ws.onclose = (event) => {
        logger.info('XtermTerminal', `WebSocket closed: code=${event.code}`)
        if (mounted.current && event.code !== 1000) {
          setStatus('disconnected')
          try {
            term.write('\r\n\x1b[31mConnection lost\x1b[0m\r\n')
            term.write('\x1b[90mClick Reconnect to retry.\x1b[0m\r\n')
          } catch {}
        }
        connecting.current = false
      }

      ws.onerror = (err) => {
        logger.error('XtermTerminal', 'WebSocket error', err)
        if (mounted.current) {
          setErrorMsg('WebSocket connection failed')
          setStatus('error')
        }
        connecting.current = false
      }

      // Terminal input → WebSocket
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }))
        }
      })

      // Resize handler - only fit when container has size (not hidden)
      const resizeObs = new ResizeObserver(() => {
        if (termRef.current && termRef.current?.offsetHeight > 0 && termRef.current?.offsetWidth > 0) {
          fitAddon.fit()
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
          }
        }
      })
      if (termRef.current) {
        resizeObs.observe(termRef.current)
      }

      // Copy/paste support
      term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        if (event.ctrlKey && event.key === 'Insert' && event.type === 'keydown') {
          const selection = term.getSelection()
          if (selection) navigator.clipboard.writeText(selection)
          return false
        }
        if (event.shiftKey && event.key === 'Insert' && event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'input', data: text }))
            }
          })
          return false
        }
        return true
      })

      // Store refs for cleanup
      resizeObsRef.current = resizeObs

      // Re-fit when page becomes visible (handles CSS hidden/show transitions)
      const handleVisibilityChange = () => {
        if (!document.hidden && termRef.current && termRef.current?.offsetHeight > 0) {
          setTimeout(() => {
            fitAddon.fit()
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
            }
          }, 50)
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
      visibilityHandlerRef.current = handleVisibilityChange

      // Also re-fit when parent container might have changed visibility
      const intersectionObs = new IntersectionObserver((entries) => {
        const el = termRef.current
        if (entries[0]?.isIntersecting && el && el.offsetHeight > 0) {
          setTimeout(() => {
            fitAddon.fit()
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
            }
          }, 50)
        }
      }, { threshold: 0.1 })
      if (termRef.current) {
        intersectionObs.observe(termRef.current)
      }
      intersectionObsRef.current = intersectionObs

      connecting.current = false
    } catch (err) {
      logger.error('XtermTerminal', 'Init failed', err)
      if (mounted.current) {
        setErrorMsg('Failed to initialize terminal')
        setStatus('error')
      }
      connecting.current = false
    }
  }, [type, serial])

  useEffect(() => {
    mounted.current = true
    connect().catch((err) => {
      logger.error('XtermTerminal', 'Connect failed', err)
    })
    return () => {
      mounted.current = false
      cleanup()
    }
  }, [])

  const handleReconnect = () => {
    connecting.current = false
    cleanup()
    connect()
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  const title = type === 'adb' && serial ? `adb -s ${serial} shell` : 'Local Terminal'

  return (
    <div className="flex flex-col flex-1 min-h-0 relative rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-background)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 bg-[var(--color-card-bg)]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-[var(--color-accent-green)] animate-pulse' : status === 'error' ? 'bg-[var(--color-accent-red)]' : 'bg-[var(--color-accent-orange)]'}`} />
          <span className="text-xs font-medium font-mono text-[var(--color-text-secondary)]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReconnect}
            className="rounded p-1 hover:bg-[var(--color-sidebar-hover)] cursor-pointer text-[var(--color-text-secondary)]"
            title="Reconnect"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleClose}
            className="rounded p-1 hover:bg-[var(--color-accent-red)] cursor-pointer text-[var(--color-text-secondary)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {type === 'adb' && status === 'ready' && (
        <div className="px-4 py-1.5 text-xs text-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 border-b border-[var(--color-border)]">
          Shell 暂不支持中文输入，请使用英文
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div className="px-4 py-2 text-xs text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10 border-b border-[var(--color-border)]">
          {errorMsg}
        </div>
      )}
      <div className="flex-1 p-3 overflow-hidden">
        <div ref={termRef} className="w-full h-full bg-[var(--color-background)]" />
      </div>
      {(status === 'disconnected' || status === 'error') && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background)]/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-6 shadow-lg">
            <p className="text-sm text-[var(--color-text-secondary)]">连接已断开</p>
            <div className="flex gap-2">
              <button
                onClick={handleReconnect}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                Reconnect
              </button>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
