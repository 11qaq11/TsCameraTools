import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Space, Table, Typography, Spin, Empty, Alert, Tag, Switch, InputNumber, Tooltip, Segmented } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import TrendChart from '../components/TrendChart'
import type { ParsedDmabufDump, DmabufGroup } from '@shared/types'

const { Title, Text } = Typography

const DMA_COLOR = '#22c55e' // dmabuf 绿（与 Dashboard 一致）
const PEAK_COLOR = '#fa541c' // 峰值橙（与 DetailPage 峰值口径一致）
/** 明细表固定展示前 N 种尺寸，不足补空行占位（UI 预留 10 行空间） */
const DMA_TOP_N = 10

/** KB 原值取整（内存数据统一 KB 单位、不保留小数） */
const kb = (v: number) => Math.round(v)

/** 时间戳 → HH:MM:SS（峰值时刻标注用） */
const fmtTs = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function DmabufDetailPage() {
  const setStage = useStore((s) => s.setStage)
  const detailPid = useStore((s) => s.detailPid)
  const detailName = useStore((s) => s.detailName)
  const dmabufByName = useStore((s) => s.dmabufByName)
  const peakDmabuf = useStore((s) => s.peakDmabuf)
  const peakDmabufBreakdown = useStore((s) => s.peakDmabufBreakdown)

  const [dump, setDump] = useState<ParsedDmabufDump | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(1000)
  /** 当前 / 峰值 视图切换：峰值态展示 worker 在 ionKb 新峰值时抓取的 dmabuf_dump 明细 */
  const [mode, setMode] = useState<'current' | 'peak'>('current')

  const fetchDump = useCallback(async (silent = false) => {
    if (detailPid == null) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const r = await window.api.capture.dmabufDumpOnce(detailPid)
      if (r.ok && r.data) setDump(r.data)
      else setError(r.error ?? '拉取 dmabuf_dump 失败')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [detailPid])

  // 进入或切换 pid 时拉取一次
  useEffect(() => {
    void fetchDump()
  }, [fetchDump])

  // 自动刷新：按 refreshMs 循环拉取 dmabuf_dump（静默，不触发 loading 闪烁）。
  // 仅当前态拉取——峰值态明细由 worker 在 ionKb 新峰值时推送，无需也不应按需刷新。
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

  // 该进程 ion 趋势（meminfo_ion 分配者口径，随轮询每 tick 更新）
  const dmabuf = detailName != null ? dmabufByName[detailName] ?? [] : []
  const timestamps = dmabuf.map((d) => d.ts)
  const ionSeries = [{ name: 'dmabuf(ion)', data: dmabuf.map((d) => d.data.ionKb) }]
  const latestIon = ionSeries[0].data[ionSeries[0].data.length - 1] ?? 0

  // 峰值：peakDmabuf[name] = ionKb 创新高时刻的 {ts, ionKb}（渲染层免费跟踪）；
  // peakDmabufBreakdown[name] = worker 在该峰值时真实抓取的 dmabuf_dump（undefined=未命中峰值；
  // null=命中但无数据/失败；对象=峰值时刻 buffer 分组）。趋势图始终实时最近 10 点。
  const peak = detailName != null ? peakDmabuf[detailName] : undefined
  const peakBreakdown = detailName != null ? peakDmabufBreakdown[detailName] : undefined
  // 当前态用实时 dump；峰值态用 worker 推送的 peakBreakdown（?? null 统一类型）
  const breakdownSrc: ParsedDmabufDump | null = mode === 'peak' ? (peakBreakdown ?? null) : dump

  // 缓冲区明细：parser 已按 totalKb 降序，取 Top10；不足 10 行补零值占位行（UI 预留 10 行）。
  // parser 跳过 sizeKb===0，故 0 作为空占位哨兵安全（真实组 sizeKb>0/count≥1）。
  const groups = breakdownSrc?.groups ?? []
  const rows: (DmabufGroup & { key: string })[] = groups
    .slice(0, DMA_TOP_N)
    .map((g, i) => ({ ...g, key: `g${i}` }))
  while (rows.length < DMA_TOP_N) {
    rows.push({ sizeKb: 0, count: 0, totalKb: 0, key: `e${rows.length}` })
  }

  // 空态文案（按 mode + 数据状态区分，诚实标注峰值明细的不可用原因）
  let emptyMsg = '暂无 dmabuf_dump 数据，点「刷新 dmabuf_dump」拉取'
  if (mode === 'peak') {
    if (peakBreakdown === undefined) emptyMsg = '暂无峰值明细（开始抓取后 ionKb 创新高时自动抓取峰值时刻 dmabuf_dump）'
    else if (peakBreakdown === null) emptyMsg = '峰值时刻该进程未持有 dmabuf 缓冲区，或 dmabuf_dump 抓取失败'
    else emptyMsg = '峰值时刻该进程未持有任何 dmabuf 缓冲区'
  } else if (dump && dump.groups.length === 0) {
    emptyMsg = '该进程未持有任何 dmabuf 缓冲区（分配者进程把 fd 交给客户端、自身不持有，属正常）'
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <Card size="small" style={{ borderRadius: 0 }} styles={{ body: { padding: '8px 12px' } }}>
        <Space wrap size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStage('dashboard')}>返回抓取面板</Button>
          <Space size={4}>
            <Title level={5} style={{ margin: 0 }}>{detailName}</Title>
            <Tag color="green">pid {detailPid}</Tag>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchDump()} loading={loading} disabled={mode === 'peak'}>刷新 dmabuf_dump</Button>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>自动刷新</Text>
            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} disabled={mode === 'peak'} />
          </Space>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>间隔(s):</Text>
            <InputNumber
              size="small"
              min={0.5}
              max={60}
              step={0.5}
              value={Math.round(refreshMs / 100) / 10}
              onChange={(v) => setRefreshMs((v ?? 1) * 1000)}
              disabled={mode === 'peak'}
            />
          </Space>
          <Segmented
            size="small"
            value={mode}
            onChange={(v) => setMode(v as 'current' | 'peak')}
            options={[
              { label: '当前', value: 'current' },
              { label: '峰值', value: 'peak' }
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>dmabuf 详细拆解</Text>
        </Space>
      </Card>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {error && <Alert style={{ marginBottom: 12 }} type="error" showIcon message={error} banner />}

        {/* 上下文：ion 趋势（meminfo_ion 分配者口径，随轮询更新）。
            峰值态下趋势图仍为最近 10 个实时点，headline 标注峰值 ionKb + 时刻。 */}
        <Card size="small" title="dmabuf 趋势（/proc/meminfo_ion 分配者口径，最近 10 点）" style={{ marginBottom: 12 }}>
          <Space size={8} style={{ marginBottom: 4 }}>
            {mode === 'peak' ? (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>峰值 ion 占用</Text>
                <Text strong style={{ color: PEAK_COLOR }}>{kb(peak?.ionKb ?? 0)} KB</Text>
                {peak && <Text type="secondary" style={{ fontSize: 11 }}>（{fmtTs(peak.ts)} 峰值时刻）</Text>}
              </>
            ) : (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>最新 ion 占用</Text>
                <Text strong style={{ color: DMA_COLOR }}>{kb(latestIon)} KB</Text>
              </>
            )}
          </Space>
          <TrendChart timestamps={timestamps} series={ionSeries} height={180} scaleY={false} emptyText="暂无 ion 趋势，返回抓取面板开始抓取" />
        </Card>

        {/* 缓冲区明细：dmabuf_dump 持有者视图，按 Rss 分组 Top10。
            当前态=实时 dmabuf_dump；峰值态=worker 在 ionKb 新峰值时抓取的明细（不可按需刷新）。 */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <span>缓冲区明细（{mode === 'peak' ? '峰值时刻 ' : ''}dmabuf_dump 持有者视图，Top {DMA_TOP_N} 按 Rss 分组，单位 KB）</span>
              {mode === 'peak' && <Tag color="orange" style={{ marginInlineEnd: 0 }}>峰值抓取</Tag>}
              <Tooltip title={
                'dmabuf_dump = 该进程持有的 dma-buf fd 视图（与 meminfo_ion 分配者口径不同）。\n' +
                '同尺寸 buffer 聚合计数：展示每个 buffer 大小、数量与总占用。\n' +
                '不持有任何 dmabuf fd 的进程（如 ion 分配者把 fd 交出、自身不持有）此处为空，属正常。\n' +
                '峰值态明细由 worker 在 ionKb 创新高时自动抓取（不阻塞主进程），非按需刷新。'
              }>
                <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Tooltip>
            </Space>
          }
        >
          {loading && !dump && mode === 'current' ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : breakdownSrc && breakdownSrc.groups.length > 0 ? (
            <>
              <div style={{ marginBottom: 8, textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>持有总占用（PROCESS TOTAL）</Text>{' '}
                <Text strong style={{ color: mode === 'peak' ? PEAK_COLOR : DMA_COLOR }}>{kb(breakdownSrc.totalKb)} KB</Text>{' '}
                <Text type="secondary" style={{ fontSize: 11 }}>（共 {groups.length} 种尺寸）</Text>
              </div>
              <Table<DmabufGroup & { key: string }>
                size="small"
                pagination={false}
                dataSource={rows}
                rowKey="key"
                columns={[
                  { title: '缓冲大小 KB', dataIndex: 'sizeKb', align: 'right', render: (v: number) => (v === 0 ? '' : kb(v)) },
                  { title: '数量', dataIndex: 'count', align: 'right', render: (v: number) => (v === 0 ? '' : v) },
                  { title: '总占用 KB', dataIndex: 'totalKb', align: 'right', render: (v: number) => (v === 0 ? '' : <Text strong>{kb(v)}</Text>) }
                ]}
              />
            </>
          ) : (
            !error && <Empty description={emptyMsg} style={{ margin: '20px 0' }} />
          )}
        </Card>
      </div>
    </div>
  )
}
