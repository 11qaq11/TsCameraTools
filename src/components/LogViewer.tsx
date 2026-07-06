import { useState, useEffect, useRef } from 'react'
import { logger } from '../utils/logger'
import { Terminal, X, Trash2 } from 'lucide-react'

export function LogViewer() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setLogs(logger.getLogs())
    }, 500)
    return () => clearInterval(interval)
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-secondary shadow-lg border border-border hover:bg-gray-50 hover:text-text-primary"
        title="查看操作日志"
      >
        <Terminal size={18} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[400px] w-[600px] flex-col rounded-lg border border-border bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-text-primary">操作日志</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { logger.clearLogs(); setLogs([]) }}
            className="rounded p-1 text-text-secondary hover:bg-gray-100 hover:text-text-primary"
            title="清除日志"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-text-secondary hover:bg-gray-100 hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed bg-gray-50">
        {logs.length === 0 && (
          <p className="text-text-secondary">暂无日志</p>
        )}
        {logs.map((line, i) => {
          let color = 'text-text-secondary'
          if (line.includes('[ERROR]')) color = 'text-red-500'
          else if (line.includes('[WARN]')) color = 'text-yellow-600'
          else if (line.includes('===')) color = 'text-blue-500'
          return <p key={i} className={color}>{line}</p>
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
