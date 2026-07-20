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
import { setPolling, setInterval, setShowSystemMem, pushSamples, clearCapture, setDetail, setStage } from '../../store/memory'
import { fetchWithAuth } from '../../utils/auth'
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
    processes,
  } = useSelector((s: RootState) => s.memory)

  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  // Summary card: total PSS + dmabuf for selected processes + MemAvailable
  const summary = useMemo(() => {
    let totalPss = 0
    let totalDmabuf = 0
    for (const name of selectedNames) {
      const dumps = dumpsysByName[name]
      if (dumps?.length) totalPss += dumps[dumps.length - 1].data.totalPss
      const dmabufs = dmabufByName[name]
      if (dmabufs?.length) totalDmabuf += dmabufs[dmabufs.length - 1].data.ionKb
    }

    // 获取最新的 MemAvailable
    let memAvailableKb = 0
    if (showSystemMem && systemMem.length > 0) {
      const latest = systemMem[systemMem.length - 1]
      memAvailableKb = latest.data.fields?.MemAvailable ?? 0
    }

    return {
      pssMb: (totalPss / 1024).toFixed(1),
      dmabufMb: (totalDmabuf / 1024).toFixed(1),
      totalMb: ((totalPss + totalDmabuf) / 1024).toFixed(1),
      memAvailableMb: (memAvailableKb / 1024).toFixed(1),
    }
  }, [selectedNames, dumpsysByName, dmabufByName, showSystemMem, systemMem])

  // Fetch PIDs on mount
  useEffect(() => {
    if (!serial || selectedNames.length === 0) return

    const fetchPids = async () => {
      try {
        const res = await fetchWithAuth(`/api/memory/pids/${serial}`, {
          method: 'POST',
          body: JSON.stringify({ names: selectedNames }),
        })
        const pidMap = (await res.json()) as Record<string, number | null>
        // Update pidByName in Redux via pushSamples
        const pidSamples: Sample[] = selectedNames.map((name) => ({
          kind: 'dumpsys' as const,
          name,
          pid: pidMap[name] ?? null,
          timestamp: Date.now(),
          data: {
            pid: pidMap[name] ?? 0,
            totalPss: 0, eglMtrackPss: 0, pssNoEgl: 0,
            totalRss: 0, totalPrivateDirty: 0, totalPrivateClean: 0,
            totalSwapPss: 0, categories: [],
          },
        }))
        dispatch(pushSamples(pidSamples))
      } catch (err) {
        logger.error('Dashboard', 'Failed to fetch PIDs:', err)
      }
    }
    fetchPids()
  }, [serial, selectedNames, dispatch])

  // 重置polling状态（进入仪表盘时）
  useEffect(() => {
    // 如果WebSocket未连接或未在采集，重置polling状态
    if (!connected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      dispatch(setPolling(false))
    }
  }, [connected, dispatch])

  // WebSocket connection (native WebSocket to /memory path)
  useEffect(() => {
    if (!serial) return

    const isDev = import.meta.env.DEV
    const wsHost = isDev ? (import.meta.env.VITE_API_HOST || 'localhost') : window.location.hostname
    const wsPort = isDev ? (import.meta.env.VITE_API_PORT || '3000') : window.location.port || '3000'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${wsHost}:${wsPort}/memory`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setConnected(true)
      // 连接建立时重置polling状态
      dispatch(setPolling(false))
      logger.info('Dashboard', 'Memory WebSocket connected')
    }

    ws.onclose = () => {
      setConnected(false)
      dispatch(setPolling(false))
      logger.info('Dashboard', 'Memory WebSocket disconnected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'samples' && msg.samples) {
          dispatch(pushSamples(msg.samples as Sample[]))
        } else if (msg.type === 'ready') {
          logger.info('Dashboard', 'Memory WebSocket ready')
        }
      } catch (e) {
        logger.error('Dashboard', 'Failed to parse WS message:', e)
      }
    }

    ws.onerror = (err) => {
      logger.error('Dashboard', 'Memory WebSocket error:', err)
    }

    wsRef.current = ws

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [serial, dispatch])

  const handleStart = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    dispatch(clearCapture())
    dispatch(setPolling(true))
    startedAtRef.current = Date.now()

    // 构建进程列表，包含动态标记
    const procs = selectedNames.map((name) => {
      const proc = processes.find((p) => p.name === name)
      return {
        name,
        pid: pidByName[name] ?? null,
        dynamic: proc?.dynamic ?? true,
      }
    })

    ws.send(JSON.stringify({
      type: 'start',
      options: {
        serial,
        procs,
        intervalMs,
        showSystemMem,
      },
    }))
  }, [serial, selectedNames, intervalMs, showSystemMem, processes, pidByName, dispatch])

  const handleStop = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({ type: 'stop' }))
    dispatch(setPolling(false))
  }, [dispatch])

  const handleProcessClick = (name: string) => {
    const pid = pidByName[name] ?? null
    dispatch(setDetail({ pid, name }))
    dispatch(setStage('detail'))
  }

  const [exporting, setExporting] = useState(false)
  const startedAtRef = useRef(Date.now())

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetchWithAuth('/api/memory/export-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procs: selectedNames,
          dumpsys: dumpsysByName,
          dmabuf: dmabufByName,
          systemMem,
          startedAt: startedAtRef.current,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memory_${new Date(startedAtRef.current).toISOString().replace(/[:.]/g, '-').substring(0, 19)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      logger.error('Dashboard', `Export failed: ${(e as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Toolbar - 固定在顶部 */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-bg)]">
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
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download size={14} />
            {exporting ? '导出中...' : '导出'}
          </button>
        </div>
      </div>

      {/* Main content - 允许自然扩展 */}
      <div className="flex flex-col p-4 gap-4">
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
        <div className={`grid gap-4 ${showSystemMem ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
          {showSystemMem && (
            <div className="rounded-xl border border-[var(--color-accent-green)]/30 bg-[var(--color-accent-green)]/5 p-4">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">整机可用内存</div>
              <div className="text-2xl font-mono font-bold text-[var(--color-accent-green)]">
                {summary.memAvailableMb}
                <span className="text-sm font-normal text-[var(--color-text-secondary)] ml-1">MB</span>
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1">MemAvailable</div>
            </div>
          )}
        </div>

        {/* Trend chart - 固定高度 */}
        <div className="h-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
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

        {/* Mini lists - 横向滚动显示所有进程 */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {selectedNames.map((name) => (
            <div
              key={name}
              className="flex-shrink-0 w-[300px] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-3"
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
