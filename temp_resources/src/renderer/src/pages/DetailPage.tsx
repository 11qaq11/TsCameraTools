import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Space, Table, Typography, Spin, Empty, Alert, Tag, Switch, InputNumber, Tooltip, Segmented } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import TrendChart from '../components/TrendChart'
import type { ParsedShowmap, ParsedDumpsys, ShowmapMapping } from '@shared/types'

const { Title, Text } = Typography

/** KB 原值取整（内存数据统一 KB 单位、不保留小数） */
const kb = (v: number) => Math.round(v)

/** 时间戳 → HH:MM:SS（峰值时刻标注用） */
const fmtTs = (ts: number): string => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function DetailPage() {
  const setStage = useStore((s) => s.setStage)
  const detailPid = useStore((s) => s.detailPid)
  const detailName = useStore((s) => s.detailName)
  const dumpsysByName = useStore((s) => s.dumpsysByName)
  const peakDumpsys = useStore((s) => s.peakDumpsys)

  const [showmap, setShowmap] = useState<ParsedShowmap | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshMs, setRefreshMs] = useState(1000)
  /** 当前 / 峰值 视图切换：峰值态展示 peakDumpsys[name] 的峰值时刻分类拆解 */
  const [mode, setMode] = useState<'current' | 'peak'>('current')

  const fetchShowmap = useCallback(async (silent = false) => {
    if (detailPid == null) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const r = await window.api.capture.showmapOnce(detailPid)
      if (r.ok && r.data) setShowmap(r.data)
      else setError(r.error ?? '拉取 showmap 失败')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [detailPid])

  // 进入或切换 pid 时拉取一次
  useEffect(() => {
    void fetchShowmap()
  }, [fetchShowmap])

  // 自动刷新：按 refreshMs 循环拉取 showmap（静默，不触发 loading 闪烁）
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

  // 该进程的 dumpsys 历史（按名键控，顶部 PSS 趋势 + 主分类表，随轮询每 tick 更新）
  const dumpsys = detailName != null ? dumpsysByName[detailName] ?? [] : []
  const latest: ParsedDumpsys | null = dumpsys.length > 0 ? dumpsys[dumpsys.length - 1].data : null
  const timestamps = dumpsys.map((d) => d.ts)
  // PSS 趋势用 KB 原值；scaleY=false 让 Y 轴从 0 起到 max，范围大，小波动不致大幅起伏
  const pssSeries = [{ name: 'PSS', data: dumpsys.map((d) => d.data.totalPss) }]
  const latestPss = pssSeries[0].data[pssSeries[0].data.length - 1] ?? 0

  // 峰值：peakDumpsys[name] 为 totalPss 创新高时刻的完整快照（渲染层免费跟踪）。
  // displayData = 峰值态用峰值快照、当前态用最新；趋势图始终实时最近 10 点（峰值可能不在窗口内）。
  const peak = detailName != null ? peakDumpsys[detailName] : undefined
  const displayData: ParsedDumpsys | null = mode === 'peak' ? (peak?.data ?? null) : latest

  // 主分类表：dumpsys meminfo 分类（含 EGL/GL mtrack，TOTAL 与顶部 PSS 同口径）
  const catRows = displayData
    ? [
        ...displayData.categories.map((c, i) => ({ ...c, key: `c${i}` })),
        {
          key: 'TOTAL',
          name: 'TOTAL',
          pssTotal: displayData.totalPss,
          privateDirty: displayData.totalPrivateDirty,
          privateClean: displayData.totalPrivateClean,
          swapPssDirty: displayData.totalSwapPss,
          rss: displayData.totalRss
        }
      ]
    : []

  // 映射明细：showmap Top 映射（细粒度 .so / anon 下钻，不含 GPU mtrack）
  const mapRows: (ShowmapMapping & { key: number })[] = (showmap?.mappings ?? []).map((m, i) => ({ ...m, key: i }))

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      <Card size="small" style={{ borderRadius: 0 }} styles={{ body: { padding: '8px 12px' } }}>
        <Space wrap size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStage('dashboard')}>返回抓取面板</Button>
          <Space size={4}>
            <Title level={5} style={{ margin: 0 }}>{detailName}</Title>
            <Tag color="blue">pid {detailPid}</Tag>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchShowmap()} loading={loading}>刷新 showmap</Button>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>自动刷新</Text>
            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
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
          <Text type="secondary" style={{ fontSize: 12 }}>meminfo 详细拆解</Text>
        </Space>
      </Card>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {error && <Alert style={{ marginBottom: 12 }} type="error" showIcon message={error} banner />}

        {/* 上下文：dumpsys PSS 趋势（折线图，随轮询更新）。
            峰值态下趋势图仍为最近 10 个实时点（峰值可能已滑出窗口），用 headline 标注峰值 PSS + 时刻。 */}
        <Card size="small" title="PSS 趋势（dumpsys meminfo，最近 10 点）" style={{ marginBottom: 12 }}>
          <Space size={8} style={{ marginBottom: 4 }}>
            {mode === 'peak' ? (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>峰值 PSS</Text>
                <Text strong style={{ color: '#fa541c' }}>{kb(peak?.data.totalPss ?? 0)} KB</Text>
                {peak && <Text type="secondary" style={{ fontSize: 11 }}>（{fmtTs(peak.ts)} 峰值时刻）</Text>}
              </>
            ) : (
              <>
                <Text type="secondary" style={{ fontSize: 12 }}>最新 PSS</Text>
                <Text strong style={{ color: '#1677ff' }}>{kb(latestPss)} KB</Text>
              </>
            )}
          </Space>
          <TrendChart timestamps={timestamps} series={pssSeries} height={180} scaleY={false} emptyText="暂无 PSS 趋势，返回抓取面板开始抓取" />
        </Card>

        {/* 主分类表：dumpsys meminfo 分类（含 GPU mtrack）。当前态随轮询更新；峰值态展示峰值时刻快照 */}
        <Card
          size="small"
          style={{ marginBottom: 12 }}
          title={
            <Space size={6}>
              <span>内存分类拆解（{mode === 'peak' ? '峰值时刻 ' : ''}dumpsys meminfo，单位 KB）</span>
              <Tooltip title="含 EGL/GL mtrack（GPU 图形内存），TOTAL 与上方 PSS 同口径。峰值态为 totalPss 创新高时刻的快照；当前态随抓取每秒更新。">
                <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Tooltip>
            </Space>
          }
        >
          {displayData ? (
            <Table
              size="small"
              pagination={false}
              dataSource={catRows}
              rowKey="key"
              rowClassName={(r: any) => (r.name === 'TOTAL' ? 'ant-table-row-total' : '')}
              columns={[
                { title: '分类', dataIndex: 'name', render: (n: string) => n === 'TOTAL' ? <Text strong>{n}</Text> : n },
                { title: 'PSS', dataIndex: 'pssTotal', align: 'right', render: (v: number) => <Text strong>{kb(v)}</Text> },
                { title: 'Priv Dirty', dataIndex: 'privateDirty', align: 'right', render: (v: number) => kb(v) },
                { title: 'Priv Clean', dataIndex: 'privateClean', align: 'right', render: (v: number) => kb(v) },
                { title: 'Swap', dataIndex: 'swapPssDirty', align: 'right', render: (v: number) => kb(v) },
                { title: 'RSS', dataIndex: 'rss', align: 'right', render: (v: number) => kb(v) }
              ]}
            />
          ) : mode === 'peak' ? (
            <Empty description="暂无峰值数据（开始抓取后 totalPss 创新高时自动记录峰值快照）" style={{ margin: '20px 0' }} />
          ) : (
            <Empty description="暂无 dumpsys 数据，返回抓取面板选中该进程并开始抓取" style={{ margin: '20px 0' }} />
          )}
        </Card>

        {/* 映射明细：showmap Top 映射（细粒度下钻，按自动刷新更新）。
            showmap 为一次性实时抓取、无峰值快照，峰值态下显式标「实时」避免「峰值标签下非峰值数据」误导。 */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <span>映射明细（showmap Top {mapRows.length}，按 PSS 降序，单位 KB）</span>
              {mode === 'peak' && <Tag color="orange" style={{ marginInlineEnd: 0 }}>实时</Tag>}
              <Tooltip title="showmap 基于 /proc/<pid>/maps，提供 .so / [anon] 等细粒度映射。注意：showmap 不含 GPU mtrack（EGL/GL），其 TOTAL 会小于上方 dumpsys 分类表，属正常现象。showmap 为实时抓取，峰值态下仍为当前值（无峰值快照）。">
                <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Tooltip>
            </Space>
          }
        >
          {loading && !showmap ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : showmap ? (
            <Table<ShowmapMapping & { key: number }>
              size="small"
              pagination={false}
              dataSource={mapRows}
              rowKey="key"
              scroll={{ y: 360 }}
              columns={[
                { title: '映射名', dataIndex: 'name', ellipsis: true, render: (n: string) => <Text style={{ fontSize: 11 }}>{n || '(匿名)'}</Text> },
                { title: 'PSS', dataIndex: 'pss', align: 'right', width: 80, render: (v: number) => kb(v) },
                { title: 'RSS', dataIndex: 'rss', align: 'right', width: 80, render: (v: number) => kb(v) },
                { title: 'VSS', dataIndex: 'vss', align: 'right', width: 80, render: (v: number) => kb(v) },
                { title: 'Dirty', dataIndex: 'dirty', align: 'right', width: 80, render: (v: number) => kb(v) }
              ]}
            />
          ) : (
            !error && <Empty description="暂无 showmap 数据，点「刷新 showmap」拉取" style={{ margin: '20px 0' }} />
          )}
        </Card>
      </div>
    </div>
  )
}
