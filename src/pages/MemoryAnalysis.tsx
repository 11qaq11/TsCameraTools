import { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../store'
import { saveToolSnapshot } from '../store/reducers/ui'
import DeviceSelect from './memory/DeviceSelect'
import ProcessManager from './memory/ProcessManager'
import Dashboard from './memory/Dashboard'
import DetailPage from './memory/DetailPage'
import DmabufDetailPage from './memory/DmabufDetailPage'

export default function MemoryAnalysis() {
  const dispatch = useDispatch<AppDispatch>()
  const stage = useSelector((s: RootState) => s.memory.stage)
  const selectedNames = useSelector((s: RootState) => s.memory.selectedNames)

  // 保存状态快照
  const saveSnapshot = useCallback(() => {
    dispatch(saveToolSnapshot({
      toolId: 'memory',
      snapshot: {
        memoryStage: stage,
        memorySelectedNames: selectedNames
      }
    }))
  }, [dispatch, stage, selectedNames])

  // 组件卸载时保存状态
  useEffect(() => {
    return () => {
      saveSnapshot()
    }
  }, [saveSnapshot])

  // 阶段变化时保存状态
  useEffect(() => {
    saveSnapshot()
  }, [stage, selectedNames, saveSnapshot])

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
