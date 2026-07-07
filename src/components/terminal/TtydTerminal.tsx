import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface TtydTerminalProps {
  serial: string
  onClose: () => void
}

export default function TtydTerminal({ serial, onClose }: TtydTerminalProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ttydUrl, setTtydUrl] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const startTtyd = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetchWithAuth('/api/ttyd/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial }),
      })
      const data = await res.json() as { success: boolean; url?: string; sessionId?: string; error?: string }
      if (data.success && data.url && data.sessionId) {
        setTtydUrl(data.url)
        setSessionId(data.sessionId)
        setStatus('ready')
        logger.info('TtydTerminal', `Session started: ${data.sessionId}`)
      } else {
        setErrorMsg(data.error || 'Failed to start ttyd')
        setStatus('error')
        logger.error('TtydTerminal', `Start failed: ${data.error}`)
      }
    } catch (err) {
      setErrorMsg('Network error')
      setStatus('error')
      logger.error('TtydTerminal', `Start error: ${err}`)
    }
  }, [serial])

  const stopTtyd = useCallback(async () => {
    if (sessionId) {
      try {
        await fetchWithAuth('/api/ttyd/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        logger.info('TtydTerminal', `Session stopped: ${sessionId}`)
      } catch {
        // ignore cleanup errors
      }
    }
  }, [sessionId])

  useEffect(() => {
    startTtyd()
    return () => {
      stopTtyd()
    }
  }, [startTtyd, stopTtyd])

  const handleClose = async () => {
    await stopTtyd()
    onClose()
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mb-4"></div>
        <p className="text-[var(--color-text-secondary)]">正在连接终端...</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-mono">{serial}</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-background)]">
        <p className="text-[var(--color-accent-red)] mb-2">终端连接失败</p>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{errorMsg}</p>
        <div className="flex gap-2">
          <button
            onClick={startTtyd}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg cursor-pointer"
          >
            重试
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-card-bg)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse"></div>
          <span className="text-sm font-mono text-[var(--color-text-secondary)]">{serial}</span>
        </div>
        <button
          onClick={handleClose}
          className="px-3 py-1 text-xs text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10 rounded transition-colors cursor-pointer"
        >
          断开连接
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={ttydUrl}
        className="flex-1 w-full border-none"
        title={`ttyd - ${serial}`}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
