import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Play,
  Square,
  Clock,
  MemoryStick,
  Download,
  ChevronLeft,
  Activity,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { io, Socket } from 'socket.io-client'
import { setPolling, setInterval, setShowSystemMem, pushSamples, clearCapture, setDetail, setStage } from '../../store/memory'
import type { RootState } from '../../store'
import type { Sample } from '../../types/memory'
import TrendChart from '../../components/memory/TrendChart'
import MiniList from '../../components/memory/MiniList'
import ProcessCard from '../../components/memory/ProcessCard'
import { logger } from '../../utils/logger'

const INTERVAL_OPTIONS = [
  { label: '500ms', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
]

export default function Dashboard() {
  const dispatch = useDispatch()
  const {
    serial,
    selectedNames,
    polling,
    intervalMs,
    showSystemMem,
    dumpsysByName,
    dmabufByName,
    pidByName,
    systemMem,
  } = useSelector((s: RootState) => s.memory)

  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Summary card: total PSS + dmabuf for selected processes
  const summary = useMemo(() => {
    let totalPss = 0
    let totalDmabuf = 0
    for (const name of selectedNames) {
      const dumps = dumpsysByName[name]
      if (dumps?.length) totalPss += dumps[dumps.length - 1].data.totalPss
      const dmabufs = dmabufByName[name]
      if (dmabufs?.length) totalDmabuf += dmabufs[dmabufs.length - 1].data.ionKb
    }
    return {
      pssMb: (totalPss / 1024).toFixed(1),
      dmabufMb: (totalDmabuf / 1024).toFixed(1),
      totalMb: ((totalPss + totalDmabuf) / 1024).toFixed(1),
    }
  }, [selectedNames, dumpsysByName, dmabufByName])

  // WebSocket connection
  useEffect(() => {
    if (!serial) return

    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      setConnected(true)
      logger.info('Dashboard', 'WebSocket connected')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      logger.info('Dashboard', 'WebSocket disconnected')
    })

    socket.on('memory:samples', (samples: Sample[]) => {
      dispatch(pushSamples(samples))
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [serial, dispatch])

  const handleStart = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !serial) return

    dispatch(clearCapture())
    dispatch(setPolling(true))

    socket.emit('memory:start', {
      serial,
      names: selectedNames,
      intervalMs,
      showSystemMem,
    })
  }, [serial, selectedNames, intervalMs, showSystemMem, dispatch])

  const handleStop = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('memory:stop')
    dispatch(setPolling(false))
  }, [dispatch])

  const handleProcessClick = (name: string) => {
    const pid = pidByName[name] ?? null
    dispatch(setDetail({ pid, name }))
    dispatch(setStage('detail'))
  }

  const handleExport = () => {
    // Placeholder for export functionality
    logger.info('Dashboard', 'Export requested')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-bg)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(setStage('process'))}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
            返回
          </button>

          <div className="w-px h-6 bg-[var(--color-border)]" />

          {polling ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--color-accent-red)] text-white text-sm font-medium hover:bg-[var(--color-accent-red)]/90 transition-colors cursor-pointer"
            >
              <Square size={14} />
              停止
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!connected || selectedNames.length === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--color-accent-green)] text-white text-sm font-medium hover:bg-[var(--color-accent-green)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play size={14} />
              开始采集
            </button>
          )}

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--color-text-secondary)]" />
            <select
              value={intervalMs}
              onChange={(e) => dispatch(setInterval(Number(e.target.value)))}
              disabled={polling}
              className="px-2 py-1 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={showSystemMem}
              onChange={(e) => dispatch(setShowSystemMem(e.target.checked))}
              disabled={polling}
              className="rounded border-[var(--color-border)]"
            />
            <MemoryStick size={14} className="text-[var(--color-text-secondary)]" />
            /proc/meminfo
          </label>
        </div>

        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-accent-red)]'}`} />
            {connected ? '已连接' : '未连接'}
          </span>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors cursor-pointer"
          >
            <Download size={14} />
            导出
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-y-auto">
        {/* Process cards */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">监控进程</span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              ({selectedNames.length} 个)
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {selectedNames.map((name) => (
              <ProcessCard
                key={name}
                name={name}
                pid={pidByName[name] ?? null}
                dumpsys={dumpsysByName[name] ?? []}
                dmabuf={dmabufByName[name] ?? []}
                selected={false}
                onClick={() => handleProcessClick(name)}
              />
            ))}
          </div>
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">总 PSS</div>
            <div className="text-2xl font-mono font-bold text-[var(--color-accent-blue)]">
              {summary.pssMb}
              <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">MB</span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">总 dmabuf</div>
            <div className="text-2xl font-mono font-bold text-[var(--color-accent-purple)]">
              {summary.dmabufMb}
              <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">MB</span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
            <div className="text-xs text-[var(--color-text-secondary)] mb-1">合计占用</div>
            <div className="text-2xl font-mono font-bold text-[var(--color-accent-orange)]">
              {summary.totalMb}
              <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">MB</span>
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="flex-1 min-h-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="text-sm font-medium text-[var(--color-text-primary)] mb-3">内存趋势</div>
          <div className="h-[calc(100%-2rem)]">
            <TrendChart
              dumpsysByName={dumpsysByName}
              dmabufByName={dmabufByName}
              systemMem={systemMem}
              selectedNames={selectedNames}
              showSystemMem={showSystemMem}
            />
          </div>
        </div>

        {/* Mini lists */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedNames.slice(0, 3).map((name) => (
            <div
              key={name}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-3"
            >
              <MiniList
                data={dumpsysByName[name] ?? []}
                label={name}
                unit="pss"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
