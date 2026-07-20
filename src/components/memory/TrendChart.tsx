import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Timed, ParsedDumpsys, DmabufPoint, ParsedMeminfo } from '../../types/memory'

interface TrendChartProps {
  dumpsysByName: Record<string, Timed<ParsedDumpsys>[]>
  dmabufByName: Record<string, Timed<DmabufPoint>[]>
  systemMem: Timed<ParsedMeminfo>[]
  selectedNames: string[]
  showSystemMem: boolean
  /** 是否使用动态纵坐标（根据最近N条数据自动调整） */
  dynamicYAxis?: boolean
  /** 动态纵坐标参考的数据点数量 */
  recentCount?: number
}

export default function TrendChart({
  dumpsysByName,
  dmabufByName,
  systemMem,
  selectedNames,
  showSystemMem,
  dynamicYAxis = false,
  recentCount = 20,
}: TrendChartProps) {
  const option = useMemo(() => {
    const series: object[] = []
    const allTimestamps = new Set<number>()

    // 计算所有选中进程的总占用
    const totalPssMap = new Map<number, number>()
    const totalDmabufMap = new Map<number, number>()

    for (const name of selectedNames) {
      const dumps = dumpsysByName[name]
      if (dumps?.length) {
        for (const d of dumps) {
          allTimestamps.add(d.ts)
          totalPssMap.set(d.ts, (totalPssMap.get(d.ts) ?? 0) + d.data.totalPss)
        }
      }
      const dmabufs = dmabufByName[name]
      if (dmabufs?.length) {
        for (const d of dmabufs) {
          allTimestamps.add(d.ts)
          totalDmabufMap.set(d.ts, (totalDmabufMap.get(d.ts) ?? 0) + d.data.ionKb)
        }
      }
    }

    // 总PSS折线图
    if (totalPssMap.size > 0) {
      const pssData = [...totalPssMap.entries()].sort((a, b) => a[0] - b[0])
      series.push({
        name: '总 PSS',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: pssData,
      })
    }

    // 总dmabuf折线图
    if (totalDmabufMap.size > 0) {
      const dmabufData = [...totalDmabufMap.entries()].sort((a, b) => a[0] - b[0])
      series.push({
        name: '总 dmabuf',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { type: 'dashed' },
        data: dmabufData,
      })
    }

    // System memory
    if (showSystemMem && systemMem.length) {
      systemMem.forEach((d) => allTimestamps.add(d.ts))
      const memTotal = systemMem[0]?.data.fields?.MemTotal ?? 0
      series.push({
        name: '系统已用',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: systemMem.map((d) => {
          const free = (d.data.fields?.MemFree ?? 0) + (d.data.fields?.Buffers ?? 0) + (d.data.fields?.Cached ?? 0)
          return [d.ts, memTotal - free]
        }),
      })
    }

    const timestamps = [...allTimestamps].sort((a, b) => a - b)

    // 动态纵坐标：根据最近N条数据计算min/max
    let yAxisConfig: Record<string, unknown> = {
      type: 'value',
      name: 'KB',
      nameTextStyle: { color: '#888', fontSize: 10 },
      axisLine: { lineStyle: { color: '#444' } },
      axisLabel: { color: '#888', fontSize: 10 },
      splitLine: { lineStyle: { color: '#333' } },
    }

    if (dynamicYAxis) {
      // 收集最近N条数据的所有值
      const recentValues: number[] = []

      for (const name of selectedNames) {
        const dumps = dumpsysByName[name]
        if (dumps?.length) {
          const recent = dumps.slice(-recentCount)
          for (const d of recent) {
            recentValues.push(d.data.totalPss)
          }
        }
        const dmabufs = dmabufByName[name]
        if (dmabufs?.length) {
          const recent = dmabufs.slice(-recentCount)
          for (const d of recent) {
            recentValues.push(d.data.ionKb)
          }
        }
      }

      if (recentValues.length > 0) {
        const minVal = Math.min(...recentValues)
        const maxVal = Math.max(...recentValues)
        const padding = (maxVal - minVal) * 0.1 || maxVal * 0.1 || 100

        yAxisConfig = {
          ...yAxisConfig,
          min: Math.max(0, Math.floor((minVal - padding) / 100) * 100),
          max: Math.ceil((maxVal + padding) / 100) * 100,
        }
      }
    }

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderColor: '#444',
        textStyle: { color: '#eee', fontSize: 12 },
        formatter: (params: Array<{ seriesName: string; value: [number, number]; color: string }>) => {
          if (!params.length) return ''
          const time = new Date(params[0].value[0]).toLocaleTimeString()
          let html = `<div style="font-size:11px;color:#aaa;margin-bottom:4px">${time}</div>`
          for (const p of params) {
            const kb = p.value[1]
            const mb = (kb / 1024).toFixed(1)
            html += `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.seriesName}: <b>${mb} MB</b></div>`
          }
          return html
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#aaa', fontSize: 11 },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: 60, right: 20, top: 16, bottom: 48 },
      xAxis: {
        type: 'time',
        min: timestamps[0],
        max: timestamps[timestamps.length - 1],
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: {
          color: '#888',
          fontSize: 10,
          formatter: (val: number) => new Date(val).toLocaleTimeString(),
        },
        splitLine: { show: false },
      },
      yAxis: yAxisConfig,
      series,
      animation: false,
    }
  }, [dumpsysByName, dmabufByName, systemMem, selectedNames, showSystemMem])

  if (!selectedNames.length && !showSystemMem) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)] text-sm">
        暂无数据，请选择进程并开始采集
      </div>
    )
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
