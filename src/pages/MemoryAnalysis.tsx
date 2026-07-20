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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* DeviceSelect 和 ProcessManager 在对应阶段显示 */}
      <div className={stage === 'device' ? '' : 'hidden'}>
        <DeviceSelect />
      </div>
      <div className={stage === 'process' ? '' : 'hidden'}>
        <ProcessManager />
      </div>
      {/* Dashboard 保持挂载，进入detail时隐藏但不断开WebSocket */}
      <div className={(stage === 'dashboard' || stage === 'detail' || stage === 'dmabuf-detail') ? '' : 'hidden'}>
        <Dashboard />
      </div>
      {/* DetailPage 在 detail 阶段显示，覆盖在 Dashboard 上方 */}
      {stage === 'detail' && (
        <div className="absolute inset-0 z-10 bg-[var(--color-background)]">
          <DetailPage />
        </div>
      )}
      {/* DmabufDetailPage 在 dmabuf-detail 阶段显示 */}
      {stage === 'dmabuf-detail' && (
        <div className="absolute inset-0 z-10 bg-[var(--color-background)]">
          <DmabufDetailPage />
        </div>
      )}
    </div>
  )
}
