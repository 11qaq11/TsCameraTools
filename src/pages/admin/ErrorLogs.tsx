import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface ErrorLog {
  id: number
  error_type: string
  message: string
  stack_trace: string
  device_info: Record<string, unknown>
  app_version: string
  created_at: string
}

export default function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/error-logs/list')
      .then(res => res.json())
      .then(data => {
        setLogs((data.logs as ErrorLog[]).map(l => ({
          ...l,
          device_info: typeof l.device_info === 'string' ? JSON.parse(l.device_info as string) : l.device_info
        })))
      })
      .catch(err => logger.error('Admin', 'Failed to fetch error logs:', err))
      .finally(() => setLoading(false))
  }, [])

  const typeColor = (t: string) => {
    if (t === 'crash' || t === 'fatal') return 'text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10'
    if (t === 'error') return 'text-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10'
    return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10'
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">错误日志（近30天）</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">加载中...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">暂无错误日志</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map(l => (
              <div key={l.id}>
                <div
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-sidebar-hover)]"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor(l.error_type)}`}>
                    {l.error_type.toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{l.message}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                    {new Date(l.created_at).toLocaleString('zh-CN')}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{l.app_version || '-'}</span>
                </div>
                {expanded === l.id && (
                  <div className="px-4 pb-3 space-y-2 bg-[var(--color-background)]/50">
                    {l.stack_trace && (
                      <div className="rounded bg-[var(--color-bg)] border border-[var(--color-border)] p-2 overflow-x-auto">
                        <pre className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-mono">{l.stack_trace}</pre>
                      </div>
                    )}
                    {l.device_info && Object.keys(l.device_info).length > 0 && (
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {Object.entries(l.device_info).map(([k, v]) => (
                          <span key={k} className="mr-3">{k}: {String(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
