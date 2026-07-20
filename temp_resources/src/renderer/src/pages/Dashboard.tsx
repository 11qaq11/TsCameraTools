import { memo, useCallback } from 'react'
import { Button, Card, Space, Tag, InputNumber, Switch, App, Typography, Alert, Empty, Tooltip } from 'antd'
import { ArrowLeftOutlined, PlayCircleOutlined, PauseCircleOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import MiniList from '../components/MiniList'
import TrendChart from '../components/TrendChart'
import type { ProcessStatus } from '@shared/types'

const { Text } = Typography

const MEM_COLOR = '#1677ff' // PSS(减EGL) 蓝
const DMA_COLOR = '#22c55e' // dmabuf(分配者) 绿
const SYS_COLOR = '#722ed1' // 整机 meminfo 紫
const TOTAL_COLOR = '#fa8c16' // 总占用(PSS+dmabuf) 橙

/** 空趋势占位（模块级稳定引用，避免 selector 内 `?? []` 每次产生新数组导致 memo 失效） */
const EMPTY_TREND: readonly never[] = []

/** 把多个 pid 的等长趋势按位求和（长度不齐时缺失位按 0） */
function sumTrend(arrays: number[][]): number[] {
  const len = arrays.reduce((m, a) => Math.max(m, a.length), 0)
  const out: number[] = []
  for (let i = 0; i < len; i++) {
    let s = 0
    for (const a of arrays) if (i < a.length) s += a[i]
    out.push(s)
  }
  return out
}

/** 把趋势数组补齐到目标长度（前部补 null），供折线图与时间轴等长对齐，缺失点形成断点 */
function padAlign(arr: number[], targetLen: number): (number | null)[] {
  if (arr.length === targetLen) return arr
  if (arr.length > targetLen) return arr.slice(arr.length - targetLen)
  return [...Array(targetLen - arr.length).fill(null), ...arr]
}

/** 进程卡左右两栏主体：左 meminfo，右 dmabuf。memClickable/dmaClickable 控制各自是否可点击跳详情。 */
function SplitBody({
  pssTrend,
  dmaTrend,
  latestPss,
  latestDma,
  memClickable,
  onMemClick,
  dmaClickable,
  onDmabufClick
}: {
  pssTrend: number[]
  dmaTrend: number[]
  latestPss: number
  latestDma: number
  memClickable: boolean
  onMemClick?: () => void
  dmaClickable: boolean
  onDmabufClick?: () => void
}) {
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, borderRight: '1px solid #f0f0f0', paddingRight: 6, minWidth: 0 }}>
        <Space size={4} style={{ marginBottom: 2 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>PSS</Text>
          <Text strong style={{ fontSize: 12, color: MEM_COLOR }}>{Math.round(latestPss)}</Text>
        </Space>
        <MiniList values={pssTrend} color={MEM_COLOR} clickable={memClickable} onClick={onMemClick} />
      </div>
      <div style={{ flex: 1, paddingLeft: 6, minWidth: 0 }}>
        <Space size={4} style={{ marginBottom: 2 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>dmabuf</Text>
          <Text strong style={{ fontSize: 12, color: DMA_COLOR }}>{Math.round(latestDma)}</Text>
        </Space>
        <MiniList values={dmaTrend} color={DMA_COLOR} clickable={dmaClickable} onClick={onDmabufClick} clickHint="点击查看 dmabuf 详细拆解" />
      </div>
    </div>
  )
}

/**
 * 单张进程卡（React.memo）。
 * 性能：自己用 selector 订阅本进程的三段数据（pssTrend/dmaTrend/pid），而非由 Dashboard
 * 订阅整个 dumpsysByName/dmabufByName 后全量下传。每 tick 只有数据真的变化的卡 re-render，
 * 避免任一进程数据变 → 整个 map 引用变 → 9 张卡全量 reconcile/commit（trace 确认这是主线程瓶颈）。
 * process(静态配置)、cardWidth、onOpenDetail 均稳定，memo 默认浅比较即可。
 */
const ProcessCard = memo(function ProcessCard({
  process,
  cardWidth,
  onOpenDetail,
  onOpenDmabufDetail
}: {
  process: ProcessStatus
  cardWidth: number
  onOpenDetail: (name: string) => void
  onOpenDmabufDetail: (name: string) => void
}) {
  // 只取本进程的趋势数组原引用（仅在 tick 写入本 name 时变）与 pid 标量。
  // 注意：selector 必须返回稳定引用（数组本体），不能在 selector 内 .map——否则每次产生新数组，
  // 浅比较不等，memo 失效。.map 提取数值留到组件体内做。
  const dumpsysArr = useStore((s) => s.dumpsysByName[process.name] ?? EMPTY_TREND)
  const dmabufArr = useStore((s) => s.dmabufByName[process.name] ?? EMPTY_TREND)
  const curPid = useStore((s) => s.pidByName[process.name] ?? null)

  const pssTrend = dumpsysArr.map((d) => d.data.pssNoEgl)
  const dmaTrend = dmabufArr.map((d) => d.data.ionKb)

  const latestPss = pssTrend[pssTrend.length - 1] ?? 0
  const latestDma = dmaTrend[dmaTrend.length - 1] ?? 0
  const running = curPid != null

  return (
    <Card
      size="small"
      style={{ width: cardWidth, flex: `0 0 ${cardWidth}px`, opacity: running ? 1 : 0.6 }}
      title={<Space size={4} direction="vertical" style={{ lineHeight: 1.2 }}>
        <Space size={4}>
          <Text strong style={{ fontSize: 13 }}>{process.alias ?? process.name}</Text>
          {process.dynamic && <Tag color="orange" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '14px', padding: '0 4px' }}>?</Tag>}
        </Space>
        <Text type="secondary" style={{ fontSize: 11 }}>pid {curPid ?? '-'}</Text>
      </Space>}
    >
      <SplitBody
        pssTrend={pssTrend}
        dmaTrend={dmaTrend}
        latestPss={latestPss}
        latestDma={latestDma}
        memClickable={running}
        onMemClick={() => onOpenDetail(process.name)}
        dmaClickable={running}
        onDmabufClick={() => onOpenDmabufDetail(process.name)}
      />
    </Card>
  )
})

export default function Dashboard() {
  const { message } = App.useApp()
  const setStage = useStore((s) => s.setStage)
  const polling = useStore((s) => s.polling)
  const setPolling = useStore((s) => s.setPolling)
  const intervalMs = useStore((s) => s.intervalMs)
  const setInterval = useStore((s) => s.setInterval)
  const showSystemMem = useStore((s) => s.showSystemMem)
  const setShowSystemMem = useStore((s) => s.setShowSystemMem)
  const processes = useStore((s) => s.processes)
  const selectedNames = useStore((s) => s.selectedNames)
  const dumpsysByName = useStore((s) => s.dumpsysByName)
  const dmabufByName = useStore((s) => s.dmabufByName)
  const systemMem = useStore((s) => s.systemMem)
  const errorMessage = useStore((s) => s.errorMessage)
  const setError = useStore((s) => s.setError)
  const clearCapture = useStore((s) => s.clearCapture)
  const setDetail = useStore((s) => s.setDetail)

  const selected = processes.filter((p) => selectedNames.includes(p.name))

  // 合计趋势（KB 原值）：跨所有选中进程按位求和（未运行的贡献 0）
  // PSS 用 cmf 口径 pssNoEgl（dumpsys TOTAL − EGL mtrack），避免图形 dma-buf 与 ion 计费重复。
  // dmabuf 用分配者口径（meminfo_ion[pid]）：只记 ion_alloc 进程（allocator/hal），APP/CAMERA3D 仅
  // 映射/持有的进程不在表中 → 0，天然不与 PSS 跨进程重复（旧 dmabuf_dump 映射口径对 CAMERA3D 的
  // cameralog 64KB 跨进程重复即源于此）。
  const pssArrays = selected.map((p) => (dumpsysByName[p.name] ?? []).map((d) => d.data.pssNoEgl))
  const dmaArrays = selected.map((p) => (dmabufByName[p.name] ?? []).map((d) => d.data.ionKb))
  const totalPssTrend = sumTrend(pssArrays)
  const totalDmaTrend = sumTrend(dmaArrays)
  const totalCombinedTrend = totalPssTrend.map((pss, i) => pss + (totalDmaTrend[i] ?? 0))
  const latestTotalPss = totalPssTrend[totalPssTrend.length - 1] ?? 0
  const latestTotalDma = totalDmaTrend[totalDmaTrend.length - 1] ?? 0
  const latestTotalCombined = totalCombinedTrend[totalCombinedTrend.length - 1] ?? 0

  // 整机 /proc/meminfo 趋势（MemAvailable，KB 原值）
  const sysAvailTrend = systemMem.map((m) => m.data.fields['MemAvailable'] ?? 0)
  const latestSysAvail = sysAvailTrend[sysAvailTrend.length - 1] ?? 0
  const latestSysFree = systemMem.length > 0 ? (systemMem[systemMem.length - 1].data.fields['MemFree'] ?? 0) : 0

  // 下方总内存折线图：时间轴取任一选中进程的 dumpsys ts 序列（同 tick 同 ts）
  const firstSel = selected[0]
  const totalTimestamps = firstSel ? (dumpsysByName[firstSel.name] ?? []).map((d) => d.ts) : []
  // 趋势数组等长对齐时间轴，缺失位 null（折线图断点）。
  // 第三条「总占用」= PSS(减EGL) + dmabuf：PSS 已剔除图形 EGL/GL mtrack，dmabuf 为分配者计费（不跨进程重复），
  // 二者无图形缓冲重叠 → 总占用可加，对齐 camera-memory-fetcher。
  const totalSeries = [
    { name: 'PSS(减EGL) 合计', data: padAlign(totalPssTrend, totalTimestamps.length) },
    { name: 'dmabuf 合计', data: padAlign(totalDmaTrend, totalTimestamps.length) },
    { name: '总占用 (PSS+dmabuf)', data: padAlign(totalCombinedTrend, totalTimestamps.length) }
  ]

  const onStart = async () => {
    if (selected.length === 0) {
      message.warning('未选择监控进程，请返回进程页选择')
      return
    }
    // 传 name + 进入时 pid + dynamic（pid 可为 null）；动态进程每 tick 重解 pid，
    // 静态进程缓存；未运行进程填 0，启动后自动抓取真实占用。
    const procs = selected.map((p) => ({ name: p.name, pid: p.pid, dynamic: p.dynamic ?? true }))
    clearCapture()
    setError(null)
    const r = (await window.api.capture.start({ intervalMs, procs, showSystemMem })) as any
    if (r.ok) {
      setPolling(true)
      message.success(`开始抓取 ${procs.length} 个进程`)
    } else {
      message.error(r.error)
    }
  }

  const onStop = async () => {
    await window.api.capture.stop()
    setPolling(false)
    setError(null)
    message.info('已停止抓取')
  }

  // 返回进程配置页：显式停止抓取（避免后台空跑）。
  // 注意：跳转详情页时 NOT 停止——轮询需继续，详情页顶部 PSS 趋势与返回后的数据都依赖它。
  const onBackToProcess = async () => {
    if (polling) {
      await window.api.capture.stop()
      setPolling(false)
    }
    setStage('process')
  }

  const onToggleSystemMem = (b: boolean) => {
    setShowSystemMem(b)
    if (polling) void window.api.capture.setShowSystemMem(b)
  }

  // 导出抓取数据到 xlsx：从 store 提取精简数值（PSS(减EGL)/dmabuf/整机），主进程写多 sheet 工作簿。
  // 导出前先停止抓取：冻结已采集数据，避免导出过程中新样本到达导致各进程时间轴长度不一致。
  const onExport = async () => {
    if (selected.length === 0) {
      message.warning('未选择监控进程')
      return
    }
    const hasData = selected.some(
      (p) => (dumpsysByName[p.name]?.length ?? 0) > 0 || (dmabufByName[p.name]?.length ?? 0) > 0
    )
    if (!hasData) {
      message.warning('暂无抓取数据，请先开始抓取')
      return
    }
    if (polling) {
      await window.api.capture.stop()
      setPolling(false)
    }
    const dumpsys: Record<string, { ts: number; pss: number; eglMtrackPss: number; rss: number }[]> = {}
    const dmabuf: Record<string, { ts: number; ionKb: number }[]> = {}
    for (const p of selected) {
      dumpsys[p.name] = (dumpsysByName[p.name] ?? []).map((d) => ({
        ts: d.ts,
        pss: d.data.pssNoEgl,
        eglMtrackPss: d.data.eglMtrackPss,
        rss: d.data.totalRss
      }))
      dmabuf[p.name] = (dmabufByName[p.name] ?? []).map((d) => ({ ts: d.ts, ionKb: d.data.ionKb }))
    }
    const r = (await window.api.capture.exportXlsx({
      procs: selected.map((p) => ({ name: p.name, alias: p.alias })),
      dumpsys,
      dmabuf,
      systemMem: systemMem.map((m) => ({ ts: m.ts, fields: m.data.fields })),
      startedAt: Date.now()
    })) as { ok: boolean; filePath?: string; canceled?: boolean; error?: string }
    if (r.ok) message.success(`已导出：${r.filePath}`)
    else if (r.canceled) message.info('已取消导出')
    else message.error(r.error ?? '导出失败')
  }

  // useCallback 稳定回调：传给 memo 化的 ProcessCard，保证其 props 不变即跳过重渲染。
  // pid 取自 store（ProcessCard 内自订阅），这里只负责跳转。
  const openDetail = useCallback((name: string) => {
    const pid = useStore.getState().pidByName[name] ?? null
    if (pid == null) return // 未运行无 pid，无法拉 showmap
    setDetail(pid, name)
    setStage('detail')
  }, [setDetail, setStage])

  // dmabuf 详情跳转：与 openDetail 对称，复用 detailPid/detailName，仅 stage 不同。
  // pid guard 同样保留：dmabuf_dump 需 pid；未运行进程无明细可看。
  const openDmabufDetail = useCallback((name: string) => {
    const pid = useStore.getState().pidByName[name] ?? null
    if (pid == null) return
    setDetail(pid, name)
    setStage('dmabuf-detail')
  }, [setDetail, setStage])

  const cardWidth = 230

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      {/* 工具栏 */}
      <Card size="small" style={{ borderRadius: 0 }} styles={{ body: { padding: '8px 12px' } }}>
        <Space wrap size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={onBackToProcess}>返回进程</Button>
          <Space size={4}>
            <Text type="secondary">间隔(s):</Text>
            <InputNumber
              size="small"
              min={0.3}
              max={60}
              step={0.1}
              value={Math.round(intervalMs / 100) / 10}
              onChange={(v) => setInterval((v ?? 1) * 1000)}
              disabled={polling}
            />
          </Space>
          <Space size={4}>
            <Text type="secondary">/proc/meminfo:</Text>
            <Switch size="small" checked={showSystemMem} onChange={onToggleSystemMem} />
          </Space>
          <Space>
            {polling
              ? <Button danger icon={<PauseCircleOutlined />} onClick={onStop}>停止</Button>
              : <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStart}>开始</Button>}
            {!polling && <Button size="small" onClick={clearCapture}>清空历史</Button>}
            <Button icon={<DownloadOutlined />} onClick={onExport} disabled={selected.length === 0 || totalTimestamps.length === 0}>导出 xlsx</Button>
          </Space>
          <Tag color={polling ? 'processing' : 'default'}>{polling ? `抓取中 · ${selected.length} 进程` : '已停止'}</Tag>
        </Space>
        {errorMessage && (
          <Alert
            style={{ marginTop: 8 }}
            type="error"
            showIcon
            banner
            message={errorMessage}
            closable
            onClose={() => setError(null)}
          />
        )}
      </Card>

      {/* 上区：横向多进程面板（左右分栏数值，最新 10 条，不占满高度） */}
      <div style={{ flex: '0 0 auto', overflowX: 'auto', overflowY: 'hidden', padding: '12px 12px 0' }}>
        {selected.length === 0 ? (
          <Empty description="未选择监控进程，请返回进程页选择" style={{ marginTop: 80 }} />
        ) : (
          <div style={{ display: 'flex', gap: 12, height: '100%', minWidth: 'min-content' }}>
            {/* 每个选中进程：左 meminfo / 右 dmabuf。未运行进程填 0，启动后自动显示真实占用。
                ProcessCard 自订阅本进程数据 + memo，Dashboard 每 tick 重渲染时卡 props 不变即跳过。 */}
            {selected.map((p) => (
              <ProcessCard key={p.name} process={p} cardWidth={cardWidth} onOpenDetail={openDetail} onOpenDmabufDetail={openDmabufDetail} />
            ))}

            {/* 合计卡：左 meminfo(不可点击) / 右 dmabuf */}
            <Card
              size="small"
              style={{ width: cardWidth, flex: `0 0 ${cardWidth}px`, background: '#fafafa', borderStyle: 'dashed' }}
              title={<Text strong style={{ fontSize: 13 }}>选中合计</Text>}
            >
              <SplitBody
                pssTrend={totalPssTrend}
                dmaTrend={totalDmaTrend}
                latestPss={latestTotalPss}
                latestDma={latestTotalDma}
                memClickable={false}
                dmaClickable={false}
              />
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #d9d9d9', textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>总占用(PSS+dmabuf)</Text>{' '}
                <Text strong style={{ fontSize: 12, color: TOTAL_COLOR }}>{Math.round(latestTotalCombined)} KB</Text>
              </div>
            </Card>

            {/* 整机 /proc/meminfo 卡（开关控制，最右） */}
            {showSystemMem && (
              <Card
                size="small"
                style={{ width: cardWidth, flex: `0 0 ${cardWidth}px`, background: '#f6f0ff' }}
                title={<Text strong style={{ fontSize: 13 }}>/proc/meminfo</Text>}
              >
                <Space size={4} style={{ marginBottom: 2 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>MemAvailable</Text>
                  <Text strong style={{ fontSize: 12, color: SYS_COLOR }}>{Math.round(latestSysAvail)}</Text>
                </Space>
                <MiniList values={sysAvailTrend} color={SYS_COLOR} />
                <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                  MemFree：{Math.round(latestSysFree)} KB
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 下区：选中进程总内存折线图（填充下方空白） */}
      <div style={{ flex: 1, minHeight: 0, padding: '8px 12px 12px', display: 'flex' }}>
        <Card
          size="small"
          style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, padding: '8px 12px 12px' } }}
          title={
            <Space size={8} wrap align="center">
              <Text strong>选中进程总内存趋势</Text>
              <Tooltip title={
                'PSS(减EGL) = dumpsys meminfo TOTAL PSS − EGL mtrack（对齐 cmf，避免与图形 ion 计费重复）\n' +
                'dmabuf = /proc/meminfo_ion 分配者口径（只记 ion_alloc 进程，不跨进程重复）\n' +
                '总占用 = PSS(减EGL) + dmabuf：PSS 已剔除图形 mtrack，dmabuf 为分配计费，二者无重叠可加。'
              }>
                <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 11 }}>PSS(减EGL) 合计：</Text>
              <Text strong style={{ color: MEM_COLOR, fontSize: 12 }}>{Math.round(latestTotalPss)} KB</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>dmabuf 合计：</Text>
              <Text strong style={{ color: DMA_COLOR, fontSize: 12 }}>{Math.round(latestTotalDma)} KB</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>总占用(PSS+dmabuf)：</Text>
              <Text strong style={{ color: TOTAL_COLOR, fontSize: 12 }}>{Math.round(latestTotalCombined)} KB</Text>
            </Space>
          }
        >
          <TrendChart
            timestamps={totalTimestamps}
            series={totalSeries}
            height={300}
            emptyText={selected.length === 0 ? '未选择监控进程' : '暂无数据，点击「开始」抓取'}
          />
        </Card>
      </div>
    </div>
  )
}
