import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, RefreshCw, Info, Loader2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { setStage } from '../../store/memory'
import type { RootState } from '../../store'
import type { ParsedDumpsys, ShowmapMapping, Timed } from '../../types/memory'
import TrendChart from '../../components/memory/TrendChart'

const kb = (v: number) => Math.round(v)

const fmtTs = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function DetailPage() {
  const dispatch = useDispatch()
  const { detailPid, detailName, dumpsysByName, peakDumpsys } = useSelector(
    (s: RootState) => s.memory
  )

  const [showmap, setShowmap] = useState<ShowmapMapping[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(2000)
  const [mode, setMode] = useState<'current' | 'peak'>('current')

  const fetchShowmap = useCallback(async (silent = false) => {
    if (detailPid == null) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/memory/showmap/${encodeURIComponent(detailPid)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.ok && data.data) setShowmap(data.data.mappings)
      else setError(data.error ?? '拉取 showmap 失败')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [detailPid])

  useEffect(() => {
    void fetchShowmap()
  }, [fetchShowmap])

  useEffect(() => {
    if (!autoRefresh) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const loop = async () => {
      await fetchShowmap(true)
      if (!cancelled) timer = setTimeout(loop, refreshMs)
    }
    timer = setTimeout(loop, refreshMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [autoRefresh, refreshMs, fetchShowmap])

  const dumpsys: Timed<ParsedDumpsys>[] = detailName != null ? dumpsysByName[detailName] ?? [] : []
  const latest: ParsedDumpsys | null = dumpsys.length > 0 ? dumpsys[dumpsys.length - 1].data : null
  const pssSeries = [{ name: 'PSS', data: dumpsys.map((d) => d.data.totalPss) }]
  const latestPss = pssSeries[0].data[pssSeries[0].data.length - 1] ?? 0

  const peak = detailName != null ? peakDumpsys[detailName] : undefined
  const displayData: ParsedDumpsys | null = mode === 'peak' ? (peak?.data ?? null) : latest

  const catRows = useMemo(() => {
    if (!displayData) return []
    return [
      ...displayData.categories.map((c, i) => ({ ...c, key: `c${i}` })),
      {
        key: 'TOTAL',
        name: 'TOTAL',
        pssTotal: displayData.totalPss,
        privateDirty: displayData.totalPrivateDirty,
        privateClean: displayData.totalPrivateClean,
        swapPssDirty: displayData.totalSwapPss,
        rss: displayData.totalRss,
      },
    ]
  }, [displayData])

  const mapRows = useMemo(() => {
    if (!showmap) return []
    return showmap.map((m, i) => ({ ...m, key: i }))
  }, [showmap])

  // Showmap total PSS (for display info)
  const showmapTotalPss = useMemo(() => {
    if (!showmap) return 0
    return showmap.reduce((sum, m) => sum + m.pss, 0)
  }, [showmap])

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
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent-blue)]/20 text-[var(--color-accent-blue)]">
            pid {detailPid}
          </span>

          <div className="w-px h-6 bg-[var(--color-border)]" />

          <button
            onClick={() => fetchShowmap()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新 showmap
          </button>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
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
              className="w-16 px-2 py-1 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => setMode('current')}
              className={`px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                mode === 'current'
                  ? 'bg-[var(--color-accent-blue)] text-white'
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
          <span className="text-xs text-[var(--color-text-secondary)]">meminfo 详细拆解</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-3 text-sm text-[var(--color-accent-red)]">
            {error}
          </div>
        )}

        {/* PSS Trend */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              PSS 趋势（dumpsys meminfo，最近 10 点）
            </span>
            <div className="flex items-center gap-2 text-xs">
              {mode === 'peak' ? (
                <>
                  <span className="text-[var(--color-text-secondary)]">峰值 PSS</span>
                  <span className="font-mono font-bold text-[var(--color-accent-orange)]">
                    {kb(peak?.data.totalPss ?? 0)} KB
                  </span>
                  {peak && (
                    <span className="text-[var(--color-text-secondary)]">
                      （{fmtTs(peak.ts)} 峰值时刻）
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[var(--color-text-secondary)]">最新 PSS</span>
                  <span className="font-mono font-bold text-[var(--color-accent-blue)]">
                    {kb(latestPss)} KB
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="h-[180px]">
            {dumpsys.length > 0 ? (
              <TrendChart
                dumpsysByName={{ [detailName ?? '']: dumpsys }}
                dmabufByName={{}}
                systemMem={[]}
                selectedNames={detailName ? [detailName] : []}
                showSystemMem={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm">
                暂无 PSS 趋势，返回抓取面板开始抓取
              </div>
            )}
          </div>
        </div>

        {/* Memory Classification Breakdown */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              内存分类拆解（{mode === 'peak' ? '峰值时刻 ' : ''}dumpsys meminfo，单位 KB）
            </span>
            <div className="group relative">
              <Info size={14} className="text-[var(--color-text-secondary)] cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                含 EGL/GL mtrack（GPU 图形内存），TOTAL 与上方 PSS 同口径。峰值态为 totalPss 创新高时刻的快照；当前态随抓取每秒更新。
              </div>
            </div>
          </div>

          {displayData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">分类</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">PSS</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">Priv Dirty</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">Priv Clean</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">Swap</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium">RSS</th>
                  </tr>
                </thead>
                <tbody>
                  {catRows.map((row) => (
                    <tr
                      key={row.key}
                      className={`border-b border-[var(--color-border)] last:border-0 ${
                        row.name === 'TOTAL' ? 'bg-[var(--color-accent-blue)]/5 font-medium' : ''
                      }`}
                    >
                      <td className="py-2 px-3">{row.name === 'TOTAL' ? <strong>TOTAL</strong> : row.name}</td>
                      <td className="py-2 px-3 text-right font-mono">{kb(row.pssTotal)}</td>
                      <td className="py-2 px-3 text-right font-mono">{kb(row.privateDirty)}</td>
                      <td className="py-2 px-3 text-right font-mono">{kb(row.privateClean)}</td>
                      <td className="py-2 px-3 text-right font-mono">{kb(row.swapPssDirty)}</td>
                      <td className="py-2 px-3 text-right font-mono">{kb(row.rss)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
              {mode === 'peak'
                ? '暂无峰值数据（开始抓取后 totalPss 创新高时自动记录峰值快照）'
                : '暂无 dumpsys 数据，返回抓取面板选中该进程并开始抓取'}
            </div>
          )}
        </div>

        {/* Showmap Mapping Detail */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                映射明细（showmap Top {mapRows.length}，按 PSS 降序，单位 KB）
              </span>
              {mode === 'peak' && (
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent-orange)]/20 text-[var(--color-accent-orange)]">
                  实时
                </span>
              )}
              <div className="group relative">
                <Info size={14} className="text-[var(--color-text-secondary)] cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  showmap 基于 /proc/&lt;pid&gt;/maps，提供 .so / [anon] 等细粒度映射。注意：showmap 不含 GPU mtrack（EGL/GL），其 TOTAL 会小于上方 dumpsys 分类表，属正常现象。showmap 为实时抓取，峰值态下仍为当前值（无峰值快照）。
                </div>
              </div>
            </div>
            {showmap && (
              <span className="text-xs text-[var(--color-text-secondary)]">
                showmap TOTAL: <span className="font-mono font-medium">{kb(showmapTotalPss)} KB</span>
              </span>
            )}
          </div>

          {loading && !showmap ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-secondary)]" />
            </div>
          ) : showmap && showmap.length > 0 ? (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-card-bg)]">
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">映射名</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium w-20">PSS</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium w-20">RSS</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium w-20">VSS</th>
                    <th className="text-right py-2 px-3 text-[var(--color-text-secondary)] font-medium w-20">Dirty</th>
                  </tr>
                </thead>
                <tbody>
                  {mapRows.map((row) => (
                    <tr key={row.key} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-sidebar-hover)]">
                      <td className="py-1.5 px-3 text-xs truncate max-w-[300px]" title={row.name}>
                        {row.name || '(匿名)'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{kb(row.pss)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{kb(row.rss)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{kb(row.vss)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-xs">{kb(row.dirty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !error && (
              <div className="text-center py-8 text-[var(--color-text-secondary)] text-sm">
                暂无 showmap 数据，点「刷新 showmap」拉取
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
