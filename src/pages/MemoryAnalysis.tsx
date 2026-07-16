import { useSelector } from 'react-redux'
import type { RootState } from '../store'
import DeviceSelect from './memory/DeviceSelect'
import ProcessManager from './memory/ProcessManager'
import Dashboard from './memory/Dashboard'
import DetailPage from './memory/DetailPage'
import DmabufDetailPage from './memory/DmabufDetailPage'

export default function MemoryAnalysis() {
  const stage = useSelector((s: RootState) => s.memory.stage)

  if (stage === 'device') return <DeviceSelect />
  if (stage === 'process') return <ProcessManager />
  if (stage === 'dashboard') return <Dashboard />
  if (stage === 'detail') return <DetailPage />
  if (stage === 'dmabuf-detail') return <DmabufDetailPage />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">内存分析</h1>
      <p className="text-[var(--color-text-secondary)]">「{stage}」阶段开发中...</p>
    </div>
  )
}
