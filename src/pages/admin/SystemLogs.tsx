import { useState } from 'react'

interface LogEntry {
  timestamp: string
  level: string
  module: string
  message: string
}

export default function SystemLogs() {
  const [logs] = useState<LogEntry[]>([])

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-[var(--color-accent-red)]'
      case 'warn': return 'text-[var(--color-accent-orange)]'
      default: return 'text-[var(--color-text-secondary)]'
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">操作日志</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">暂无日志数据</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)] sticky top-0">
                  <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium w-40">时间</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium w-16">级别</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium w-32">模块</th>
                  <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">消息</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-sidebar-hover)]">
                    <td className="px-4 py-2 font-mono text-xs text-[var(--color-text-secondary)]">{log.timestamp}</td>
                    <td className={`px-4 py-2 text-xs font-medium ${levelColor(log.level)}`}>{log.level.toUpperCase()}</td>
                    <td className="px-4 py-2 text-xs text-[var(--color-text-secondary)]">{log.module}</td>
                    <td className="px-4 py-2 text-xs">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
