import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchWithAuth } from '../utils/auth'
import { logger } from '../utils/logger'

export default function LocalTerminal() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ttydUrl, setTtydUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const sessionIdRef = useRef('')

  const stopTtyd = useCallback(async () => {
    const sid = sessionIdRef.current
    if (sid) {
      logger.info('LocalTerminal', `stopTtyd: stopping session ${sid}`)
      try {
        await fetchWithAuth('/api/ttyd/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sid }),
        })
        logger.info('LocalTerminal', `Session stopped: ${sid}`)
      } catch (err) {
        logger.warn('LocalTerminal', `stopTtyd: cleanup error (ignored)`, { error: String(err) })
      }
      sessionIdRef.current = ''
    }
  }, [])

  const startTtyd = useCallback(async () => {
    await stopTtyd()
    setStatus('loading')
    logger.info('LocalTerminal', 'startTtyd: requesting local shell session')

    try {
      const startTime = Date.now()
      const res = await fetchWithAuth('/api/ttyd/start-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const elapsed = Date.now() - startTime
      logger.info('LocalTerminal', `startTtyd: response received in ${elapsed}ms, status=${res.status}`)

      const data = await res.json() as { success: boolean; url?: string; sessionId?: string; error?: string }
      logger.info('LocalTerminal', 'startTtyd: response data', data)

      if (data.success && data.url && data.sessionId) {
        sessionIdRef.current = data.sessionId
        setTtydUrl(data.url)
        setStatus('ready')
        logger.info('LocalTerminal', `Session started: ${data.sessionId}, url=${data.url}`)
      } else {
        setErrorMsg(data.error || 'Failed to start terminal')
        setStatus('error')
        logger.error('LocalTerminal', `Start failed: ${data.error}`)
      }
    } catch (err) {
      setErrorMsg('Network error')
      setStatus('error')
      logger.error('LocalTerminal', `Start error: ${err}`)
    }
  }, [stopTtyd])

  useEffect(() => {
    startTtyd()
    return () => {
      stopTtyd()
    }
  }, [])

  const handleReconnect = async () => {
    await startTtyd()
  }

  const handleDisconnect = async () => {
    await stopTtyd()
    setStatus('loading')
    setTtydUrl('')
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-card-bg)] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-orange)] animate-pulse"></div>
            <span className="text-sm font-mono text-[var(--color-text-secondary)]">本地终端</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-background)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mb-4"></div>
          <p className="text-[var(--color-text-secondary)]">正在启动终端...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-card-bg)] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-red)]"></div>
            <span className="text-sm font-mono text-[var(--color-text-secondary)]">本地终端</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--color-background)]">
          <p className="text-[var(--color-accent-red)] mb-2">终端启动失败</p>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{errorMsg}</p>
          <button
            onClick={handleReconnect}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg cursor-pointer"
          >
            重试
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
          <span className="text-sm font-mono text-[var(--color-text-secondary)]">本地终端 - C:\Users\Administrator</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReconnect}
            className="px-3 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded transition-colors cursor-pointer"
          >
            重新连接
          </button>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-xs text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10 rounded transition-colors cursor-pointer"
          >
            断开连接
          </button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={ttydUrl}
        className="flex-1 w-full border-none"
        title="Local Terminal"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
