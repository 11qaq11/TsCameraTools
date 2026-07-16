import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, RefreshCw, Info, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { setStage } from '../../store/memory'
import type { RootState } from '../../store'
import type { DmabufGroup, ParsedDmabufDump, Timed, DmabufPoint } from '../../types/memory'
import TrendChart from '../../components/memory/TrendChart'

const DMA_TOP_N = 10

const kb = (v: number) => Math.round(v)

const fmtTs = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function DmabufDetailPage() {
  const dispatch = useDispatch()
  const { detailPid, detailName, dmabufByName, peakDmabuf, peakDmabufBreakdown } = useSelector(
    (s: RootState) => s.memory
  )

  const [dump, setDump] = useState<ParsedDmabufDump | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(2000)
  const [mode, setMode] = useState<'current' | 'peak'>('current')

  const fetchDump = useCallback(async (silent = false) => {
    if (detailPid == null) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/memory/dmabuf-dump/${encodeURIComponent(detailPid)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ok && data.data) setDump(data.data)
      else setError(data.error ?? '拉取 dmabuf_dump 失败')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [detailPid])

  useEffect(() => {
    void fetchDump()
  }, [fetchDump])

  // Auto-refresh only in current mode
  useEffect(() => {
    if (!autoRefresh || mode === 'peak') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const loop = async () => {
      await fetchDump(true)
      if (!cancelled) timer = setTimeout(loop, refreshMs)
    }
    timer = setTimeout(loop, refreshMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [autoRefresh, refreshMs, fetchDump, mode])

  // dmabuf trend data
  const dmabuf: Timed<DmabufPoint>[] = detailName != null ? dmabufByName[detailName] ?? [] : []
  const ionSeries = [{ name: 'dmabuf(ion)', data: dmabuf.map((d) => d.data.ionKb) }]
  const latestIon = ionSeries[0].data[ionSeries[0].data.length - 1] ?? 0

  // Peak data
  const peak = detailName != null ? peakDmabuf[detailName] : undefined
  const peakBreakdown = detailName != null ? peakDmabufBreakdown[detailName] : undefined
  const breakdownSrc: ParsedDmabufDump | null = mode === 'peak' ? (peakBreakdown ?? null) : dump

  // Buffer breakdown rows
  const groups = breakdownSrc?.groups ?? []
  const rows: (DmabufGroup & { key: string })[] = useMemo(() => {
    const r = groups
      .slice(0, DMA_TOP_N)
      .map((g, i) => ({ ...g, key: `g${i}` }))
    while (r.length < DMA_TOP_N) {
      r.push({ sizeKb: 0, count: 0, totalKb: 0, key: `e${r.length}` })
    }
    return r
  }, [groups])

  // Empty state messages
  let emptyMsg = '暂无 dmabuf_dump 数据，点「刷新 dmabuf_dump」拉取'
  if (mode === 'peak') {
    if (peakBreakdown === undefined) emptyMsg = '暂无峰值明细（开始抓取后 ionKb 创新高时自动抓取峰值时刻 dmabuf_dump）'
    else if (peakBreakdown === null) emptyMsg = '峰值时刻该进程未持有 dmabuf 缓冲区，或 dmabuf_dump 抓取失败'
    else emptyMsg = '峰值时刻该进程未持有任何 dmabuf 缓冲区'
  } else if (dump && dump.groups.length === 0) {
    emptyMsg = '该进程未持有任何 dmabuf 缓冲区（分配者进程把 fd 交给客户端、自身不持有，属正常）'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-bg)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(setStage('dashboard'))}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
            返回
          </button>

          <div className="w-px h-6 bg-[var(--color-border)]" />

          <span className="text-sm font-medium text-[var(--color-text-primary)]">{detailName}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)]">
            pid {detailPid}
          </span>

          <div className="w-px h-6 bg-[var(--color-border)]" />

          <button
            onClick={() => fetchDump()}
            disabled={loading || mode === 'peak'}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新 dmabuf_dump
          </button>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              disabled={mode === 'peak'}
              className="rounded border-[var(--color-border)]"
            />
            自动刷新
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">间隔(s):</span>
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={Math.round(refreshMs / 100) / 10}
              onChange={(e) => setRefreshMs((Number(e.target.value) || 1) * 1000)}
              disabled={mode === 'peak'}
              className="w-16 px-2 py-1 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setMode('current')}
              className={`px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                mode === 'current'
                  ? 'bg-[var(--color-accent-green)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              当前
            </button>
            <button
              onClick={() => setMode('peak')}
              className={`px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                mode === 'peak'
                  ? 'bg-[var(--color-accent-orange)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              峰值
            </button>
          </div>
          <span className="text-xs text-[var(--color-text-secondary)]">dmabuf 详细拆解</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </div>
        )}

        {/* dmabuf Trend */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              dmabuf 趋势（/proc/meminfo_ion 分配者口径，最近 10 点）
            </span>
            <div className="flex items-center gap-2 text-xs">
              {mode === 'peak' ? (
                <>
                  <span className="text-[var(--color-text-secondary)]">峰值 ion 占用</span>
                  <span className="font-mono font-bold text-[var(--color-accent-orange)]">
                    {kb(peak?.ionKb ?? 0)} KB
                  </span>
                  {peak && (
                    <span className="text-[var(--color-text-secondary)]">
                      （{fmtTs(peak.ts)} 峰值时刻）
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[var(--color-text-secondary)]">最新 ion 占用</span>
                  <span className="font-mono font-bold text-[var(--color-accent-green)]">
                    {kb(latestIon)} KB
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="h-[180px]">
            {dmabuf.length > 0 ? (
              <TrendChart
                dumpsysByName={{}}
                dmabufByName={{ [detailName ?? '']: dmabuf }}
                systemMem={[]}
                selectedNames={detailName ? [detailName] : []}
                showSystemMem={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm">
                暂无 ion 趋势，返回抓取面板开始抓取
              </div>
            )}
          </div>
        </div>

        {/* Buffer Breakdown */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                缓冲区明细（{mode === 'peak' ? '峰值时刻 ' : ''}dmabuf_dump 持有者视图，Top {DMA_TOP_N} 按 Rss 分组，单位 KB）
              </span>
              {mode === 'peak' && (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent-orange)]/20 text-[var(--color-accent-orange)]">
                  峰值抓取
                </span>
              )}
              <div className="group relative">
                <Info size={14} className="text-[var(--color-text-secondary)] cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-pre-line">
                  dmabuf_dump = 该进程持有的 dma-buf fd 视图（与 meminfo_ion 分配者口径不同）。
                  同尺寸 buffer 聚合计数：展示每个 buffer 大小、数量与总占用。
                  不持有任何 dmabuf fd 的进程（如 ion 分配者把 fd 交出、自身不持有）此处为空，属正常。
                  峰值态明细由 worker 在 ionKb 创新高时自动抓取（不阻塞主进程），非按需刷新。
                </div>
              </div>
            </div>
          </div>

          {loading && !dump && mode === 'current' ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-secondary)]" />
            </div>
          ) : breakdownSrc && breakdownSrc.groups.length > 0 ? (
            <>
              <div className="flex items-center justify-end mb-2 text-xs">
                <span className="text-[var(--color-text-secondary)]">持有总占用（PROCESS TOTAL）</span>
                <span className="font-mono font-bold text-[var(--color-accent-green)] ml-2">
                  {kb(breakdownSrc.totalKb)} KB
                </span>
                <span className="text-[var(--color-text-secondary)] ml-2">
                  （共 {groups.length} 种尺寸）
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">缓冲大小 KB</th>
                      <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">数量</th>
                      <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">总占用 KB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-2 px-3 text-right font-mono">
                          {row.sizeKb === 0 ? '' : kb(row.sizeKb)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.count === 0 ? '' : row.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {row.totalKb === 0 ? '' : kb(row.totalKb)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !error && (
              <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
                {emptyMsg}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
