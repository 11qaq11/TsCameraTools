import { useMemo } from 'react'
import type { Timed, ParsedDumpsys, DmabufPoint } from '../../types/memory'

interface MiniListProps {
  data: Timed<ParsedDumpsys>[] | Timed<DmabufPoint>[]
  label: string
  unit?: 'pss' | 'dmabuf'
}

export default function MiniList({ data, label, unit = 'pss' }: MiniListProps) {
  const items = useMemo(() => {
    const recent = data.slice(-10).reverse()
    return recent.map((d, i) => {
      const value = unit === 'pss'
        ? (d.data as ParsedDumpsys).totalPss
        : (d.data as DmabufPoint).ionKb
      return {
        ts: d.ts,
        value,
        mb: (value / 1024).toFixed(1),
        isLatest: i === 0,
      }
    })
  }, [data, unit])

  if (!items.length) {
    return (
      <div className="text-xs text-[var(--color-text-secondary)] text-center py-4">
        暂无{label}数据
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{label}</div>
      {items.map((item) => (
        <div
          key={item.ts}
          className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
            item.isLatest
              ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] font-medium'
              : 'text-[var(--color-text-primary)]'
          }`}
        >
          <span className="font-mono opacity-60">
            {new Date(item.ts).toLocaleTimeString()}
          </span>
          <span className="font-mono">{item.mb} MB</span>
        </div>
      ))}
    </div>
  )
}
