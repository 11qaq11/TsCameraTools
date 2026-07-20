import { useEffect, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'

export interface TrendSeries {
  name: string
  /** 与 timestamps 一一对应的数值序列；缺失点用 null */
  data: (number | null)[]
}

interface Props {
  timestamps: number[]
  series: TrendSeries[]
  height?: number
  /** 无数据时的提示文案 */
  emptyText?: string
  /** Y 轴是否按数据范围自适应缩放（默认 true，不从 0 起）。
   *  详情页传 false：Y 轴从 0 起到 max，范围大，小波动不致视觉上的大幅起伏。 */
  scaleY?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 实时趋势图。
 *
 * 性能：数据每 tick 变化时，不立即 setOption，而是推迟到 requestAnimationFrame，
 * 且在用户交互（pointerdown，如拖滑动条/点按）期间暂停重绘，松开补绘最新一帧。
 * 窗口拖动时 OS 模态循环占用主线程，rAF 自然不触发，图表更新自动暂停——
 * 避免每 tick 同步 setOption 与拖动争主线程导致卡顿。
 * 实现：shouldSetOption 恒 false 禁用 echarts-for-react 的自动 setOption，
 * 由本组件用 rAF + 交互感知接管；autoResize（size-sensor）仍由其内部独立处理。
 */
export default function TrendChart({ timestamps, series, height = 140, emptyText = '暂无数据，点击「开始」抓取', scaleY = true }: Props) {
  const chartRef = useRef<ReactECharts | null>(null)
  const readyRef = useRef(false)
  const interactingRef = useRef(false)
  const pendingRef = useRef(false)
  const optionRef = useRef<Record<string, unknown> | null>(null)
  const rafRef = useRef<number | null>(null)

  const option = useMemo(() => {
    if (timestamps.length === 0) return null
    const labels = timestamps.map((t) => {
      const d = new Date(t)
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    })
    return {
      // 实时趋势：关闭动画。每 tick 新增一个点，默认 1s 缓动会持续跑 rAF，与拖动窗口/滑动条
      // 争主线程导致卡顿；关动画后 setOption 仅做增量布局，交互顺滑。
      animation: false,
      grid: { left: 48, right: 16, top: 16, bottom: 24 },
      tooltip: { trigger: 'axis' },
      // 固定 legend（非 scroll）：trace 显示 layOutGridByOuterBounds 是最重项，scroll legend
      // 每 tick 重算可见项布局；只有 3 条线用固定 legend 更省。
      legend: { top: 0, textStyle: { fontSize: 11 } },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, hideOverlap: true } },
      yAxis: { type: 'value', axisLabel: { fontSize: 10 }, scale: scaleY },
      series: series.map((s) => ({
        name: s.name,
        type: 'line',
        showSymbol: false,
        // 关 smooth：实时趋势用直折线即可；smooth:true 在多线时触发贝塞尔拟合的额外路径计算。
        smooth: false,
        lineStyle: { width: 1.5 },
        data: s.data
      }))
    }
  }, [timestamps, series, scaleY])

  // 数据变化 → 存最新 option → 调度一帧 rAF 重绘（若已在交互中则标 pending，等松开补绘）
  useEffect(() => {
    if (!option) return
    optionRef.current = option
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const inst = chartRef.current?.getEchartsInstance()
        if (!inst || !readyRef.current || interactingRef.current) {
          pendingRef.current = true
          return
        }
        // lazyUpdate:true 让 ECharts 合并多次更新、延迟到下帧统一刷新，
        // 减轻 GlobalModel2.setOption + layOutGridByOuterBounds 每 tick 全量重算的开销。
        inst.setOption(option, { notMerge: false, lazyUpdate: true })
        pendingRef.current = false
      })
    }
  }, [option])

  // 交互感知：pointerdown 暂停 setOption，pointerup/blur 补绘挂起的最新数据
  useEffect(() => {
    const pause = () => { interactingRef.current = true }
    const flush = () => {
      interactingRef.current = false
      if (pendingRef.current && optionRef.current && readyRef.current) {
        const inst = chartRef.current?.getEchartsInstance()
        if (inst) {
          inst.setOption(optionRef.current, { notMerge: false, lazyUpdate: true })
          pendingRef.current = false
        }
      }
    }
    window.addEventListener('pointerdown', pause, true)
    window.addEventListener('pointerup', flush, true)
    window.addEventListener('blur', flush)
    return () => {
      window.removeEventListener('pointerdown', pause, true)
      window.removeEventListener('pointerup', flush, true)
      window.removeEventListener('blur', flush)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (timestamps.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>
        {emptyText}
      </div>
    )
  }
  return (
    <ReactECharts
      ref={chartRef}
      option={option ?? {}}
      notMerge={false}
      shouldSetOption={() => false}
      onChartReady={(inst) => {
        readyRef.current = true
        if (optionRef.current) inst.setOption(optionRef.current, { notMerge: false, lazyUpdate: true })
      }}
      style={{ height, width: '100%' }}
    />
  )
}
