import { Cpu, Droplets } from 'lucide-react'
import type { Timed, ParsedDumpsys, DmabufPoint } from '../../types/memory'

interface ProcessCardProps {
  name: string
  alias?: string
  pid: number | null
  dumpsys: Timed<ParsedDumpsys>[]
  dmabuf: Timed<DmabufPoint>[]
  selected: boolean
  onClick: () => void
}

export default function ProcessCard({
  name,
  alias,
  pid,
  dumpsys,
  dmabuf,
  selected,
  onClick,
}: ProcessCardProps) {
  const latestPss = dumpsys.length ? dumpsys[dumpsys.length - 1] : null
  const latestDmabuf = dmabuf.length ? dmabuf[dmabuf.length - 1] : null

  const pssMb = latestPss ? (latestPss.data.totalPss / 1024).toFixed(1) : '-'
  const dmabufMb = latestDmabuf ? (latestDmabuf.data.ionKb / 1024).toFixed(1) : '-'

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-48 rounded-xl border p-3 text-left transition-all cursor-pointer ${
        selected
          ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/5'
          : 'border-[var(--color-border)] bg-[var(--color-card-bg)] hover:border-[var(--color-text-secondary)]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {alias || name}
        </span>
        {pid && (
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
            {pid}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-[var(--color-accent-blue)]" />
          <div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">PSS</div>
            <div className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
              {pssMb}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets size={12} className="text-[var(--color-accent-purple)]" />
          <div>
            <div className="text-[10px] text-[var(--color-text-secondary)]">dmabuf</div>
            <div className="text-sm font-mono font-medium text-[var(--color-text-primary)]">
              {dmabufMb}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[var(--color-text-secondary)] mt-1.5 truncate">
        {name}
      </div>
    </button>
  )
}
