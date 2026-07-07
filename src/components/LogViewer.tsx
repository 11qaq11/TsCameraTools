import { useState, useEffect, useRef } from 'react'
import { logger } from '../utils/logger'
import { Terminal, X, Trash2, Pin, PinOff } from 'lucide-react'

export function LogViewer() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [pinned, setPinned] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolled = useRef(false)

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setLogs(logger.getLogs())
    }, 1000)
    return () => clearInterval(interval)
  }, [open])

  useEffect(() => {
    if (pinned && !userScrolled.current) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight })
    }
  }, [logs, pinned])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 30
    if (!atBottom) {
      userScrolled.current = true
    } else {
      userScrolled.current = false
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1E293B] text-[#22C55E] shadow-lg border border-[#334155] hover:bg-[#334155] transition-colors cursor-pointer pulse-glow"
        title="查看操作日志"
      >
        <Terminal size={18} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[400px] w-[600px] flex-col rounded-lg border border-[#334155] shadow-2xl" style={{ backgroundColor: '#1E293B' }}>
      <div className="flex items-center justify-between border-b border-[#334155] px-3 py-2">
        <span className="text-xs font-medium text-white font-mono">操作日志</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPinned(!pinned)}
            className={`rounded p-1 transition-colors cursor-pointer ${pinned ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#94A3B8] hover:bg-[#334155]'}`}
            title={pinned ? "取消自动滚动" : "自动滚动到底部"}
          >
            {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          </button>
          <button
            onClick={() => { logger.clearLogs(); setLogs([]) }}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#334155] hover:text-white cursor-pointer"
            title="清除日志"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-[#94A3B8] hover:bg-[#334155] hover:text-white cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed"
        style={{ backgroundColor: '#0F172A' }}
      >
        {logs.length === 0 && (
          <p className="text-[#475569]">暂无日志</p>
        )}
        {logs.map((line, i) => {
          let color = '#94A3B8'
          if (line.includes('[ERROR]')) color = '#EF4444'
          else if (line.includes('[WARN]')) color = '#F59E0B'
          else if (line.includes('===')) color = '#3B82F6'
          else if (line.includes('[Shell]')) color = '#22C55E'
          return <p key={i} style={{ color }}>{line}</p>
        })}
      </div>
    </div>
  )
}
