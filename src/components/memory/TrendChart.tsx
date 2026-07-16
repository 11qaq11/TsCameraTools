import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { Timed, ParsedDumpsys, DmabufPoint, ParsedMeminfo } from '../../types/memory'

interface TrendChartProps {
  dumpsysByName: Record<string, Timed<ParsedDumpsys>[]>
  dmabufByName: Record<string, Timed<DmabufPoint>[]>
  systemMem: Timed<ParsedMeminfo>[]
  selectedNames: string[]
  showSystemMem: boolean
}

export default function TrendChart({
  dumpsysByName,
  dmabufByName,
  systemMem,
  selectedNames,
  showSystemMem,
}: TrendChartProps) {
  const option = useMemo(() => {
    const series: object[] = []
    const allTimestamps = new Set<number>()

    // Collect PSS series per process
    for (const name of selectedNames) {
      const dumps = dumpsysByName[name]
      if (dumps?.length) {
        dumps.forEach((d) => allTimestamps.add(d.ts))
        series.push({
          name: `${name} PSS`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: dumps.map((d) => [d.ts, d.data.totalPss]),
        })
      }
      const dmabufs = dmabufByName[name]
      if (dmabufs?.length) {
        dmabufs.forEach((d) => allTimestamps.add(d.ts))
        series.push({
          name: `${name} dmabuf`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { type: 'dashed' },
          data: dmabufs.map((d) => [d.ts, d.data.ionKb]),
        })
      }
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
      yAxis: {
        type: 'value',
        name: 'KB',
        nameTextStyle: { color: '#888', fontSize: 10 },
        axisLine: { lineStyle: { color: '#444' } },
        axisLabel: { color: '#888', fontSize: 10 },
        splitLine: { lineStyle: { color: '#333' } },
      },
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
