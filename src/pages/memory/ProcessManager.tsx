import { useState, useEffect, useCallback } from 'react'
import {
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Settings2,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'
import { setProcesses, setCustomProcesses, setSelected, setStage } from '../../store/memory'
import type { ProcessStatus, ProcessEntry } from '../../types/memory'
import type { RootState } from '../../store'

const PRESET_PROCESSES: ProcessEntry[] = [
  { name: 'com.android.camera', alias: 'APP', dynamic: true, category: 'app' },
  { name: 'com.vivo.gallery', alias: 'GALLERY', dynamic: true, category: 'app' },
  { name: 'com.vivo.vivo3rdalgoservice', alias: 'ALGO', dynamic: true, category: 'algo' },
  { name: 'cam0_alloc_buf', alias: 'CAM0_ALLOC_BUF', dynamic: true, category: 'allocator' },
  { name: 'cameraserver', alias: 'SERVER', category: 'service' },
  { name: 'camerahalserver', alias: 'HALSERVER', category: 'service' },
  { name: 'vivocameraserver', alias: 'VIVOSERVER', category: 'service' },
  { name: 'vendor.qti.camera.provider', alias: 'QTI_PROVIDER', category: 'service' },
  { name: 'vendor.qti.camera.provider-service_64', alias: 'QCOM_HAL64', category: 'service' },
  { name: 'camx.shimserver', alias: 'SHIM', category: 'service' },
  { name: 'camxservicemanager', alias: 'SVM', category: 'service' },
  { name: 'camxcore', alias: 'CORE', dynamic: true, category: 'service' },
  { name: 'vendor.camera.provider@2.7', alias: 'HAL27', category: 'service' },
  { name: 'android.hardware.camera.provider@2.7', alias: 'AIDL27', category: 'service' },
  { name: 'media.codec', alias: 'CODEC', category: 'service' },
  { name: 'media.extractor', alias: 'EXTRACTOR', category: 'service' },
  { name: 'mediaserver', alias: 'MEDIA', category: 'service' },
  { name: 'surfaceflinger', alias: 'SF', category: 'service' },
  { name: 'zygote64', alias: 'ZYGOTE', category: 'kernel' },
  { name: 'alloc_buf', alias: 'ALLOC_BUF', dynamic: true, category: 'allocator' },
]

export default function ProcessManager() {
  const dispatch = useDispatch()
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
  const serial = useSelector((s: RootState) => s.memory.serial)
  const customProcesses = useSelector((s: RootState) => s.memory.customProcesses)

  const [processes, setLocalProcesses] = useState<ProcessStatus[]>([])
  const [selectedNames, setLocalSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addAlias, setAddAlias] = useState('')

  const refreshPids = useCallback(async (procs: ProcessStatus[]) => {
    if (!serial) return procs
    try {
      const names = procs.map((p) => p.name)
      let pidMap: Record<string, number | null>
      if (isElectron) {
        pidMap = await window.electronAPI!.memoryGetPids(serial, names)
      } else {
        const res = await fetchWithAuth(`/api/memory/pids/${serial}`, {
          method: 'POST',
          body: JSON.stringify({ names }),
        })
        pidMap = await res.json() as Record<string, number | null>
      }
      return procs.map((p) => ({
        ...p,
        pid: pidMap[p.name] ?? null,
        running: (pidMap[p.name] ?? null) !== null,
      }))
    } catch (err) {
      logger.error('ProcessManager', 'Failed to refresh PIDs:', err)
      return procs
    }
  }, [serial])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      // 合并预设进程和用户自定义进程
      const allProcessEntries: ProcessEntry[] = [
        ...PRESET_PROCESSES,
        ...customProcesses,
      ]
      // 去重（基于name）
      const seen = new Set<string>()
      const deduped = allProcessEntries.filter((p) => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
      })
      const initial: ProcessStatus[] = deduped.map((p) => ({
        ...p,
        pid: null,
        running: false,
      }))
      const resolved = await refreshPids(initial)
      // 将运行中进程排在顶部
      const sorted = [...resolved].sort((a, b) => {
        if (a.running === b.running) return 0
        return a.running ? -1 : 1
      })
      setLocalProcesses(sorted)
      setLocalSelected(new Set(sorted.filter((p) => p.running).map((p) => p.name)))
      setLoading(false)
    }
    init()
  }, [refreshPids, customProcesses])

  const handleRefresh = async () => {
    setLoading(true)
    const resolved = await refreshPids(processes)
    // 将运行中进程排在顶部
    const sorted = [...resolved].sort((a, b) => {
      if (a.running === b.running) return 0
      return a.running ? -1 : 1
    })
    setLocalProcesses(sorted)
    setLoading(false)
  }

  const toggleSelect = (name: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectAllRunning = () => {
    setLocalSelected(new Set(processes.filter((p) => p.running).map((p) => p.name)))
  }

  const handleAdd = () => {
    const name = addName.trim()
    if (!name || processes.some((p) => p.name === name)) return
    const entry: ProcessStatus = {
      name,
      alias: addAlias.trim() || undefined,
      dynamic: true,
      pid: null,
      running: false,
    }
    setLocalProcesses((prev) => [...prev, entry])
    // 保存到Redux
    const newCustom: ProcessEntry = {
      name,
      alias: addAlias.trim() || undefined,
      dynamic: true,
      category: 'app',
    }
    dispatch(setCustomProcesses([...customProcesses, newCustom]))
    setAddName('')
    setAddAlias('')
    setShowAdd(false)
  }

  const handleRemove = (name: string) => {
    setLocalProcesses((prev) => prev.filter((p) => p.name !== name))
    setLocalSelected((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    // 从Redux中删除
    dispatch(setCustomProcesses(customProcesses.filter((p) => p.name !== name)))
  }

  const handleEnter = () => {
    dispatch(setProcesses(processes))
    dispatch(setSelected([...selectedNames]))
    dispatch(setStage('dashboard'))
  }

  const allSelected = processes.length > 0 && processes.every((p) => selectedNames.has(p.name))

  return (
    <div className="flex flex-col h-full p-6">
      {/* 标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            <Settings2 size={18} className="inline mr-2 align-text-bottom" />
            进程管理
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {loading
              ? '正在检测进程...'
              : `已选择 ${selectedNames.size} / ${processes.length} 个进程`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={selectAllRunning}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors cursor-pointer"
          >
            <CheckSquare size={14} />
            全选运行中
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-accent-green)] text-white rounded-lg hover:bg-[var(--color-accent-green)]/90 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            添加进程
          </button>
        </div>
      </div>

      {/* 添加进程表单 */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)]">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">进程名 *</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="com.example.app"
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-green)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">别名</label>
              <input
                value={addAlias}
                onChange={(e) => setAddAlias(e.target.value)}
                placeholder="MY_APP"
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-green)]"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!addName.trim()}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-accent-green)] text-white hover:bg-[var(--color-accent-green)]/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              确认
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddName(''); setAddAlias('') }}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-sidebar-hover)] transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 进程表格 */}
      {processes.length > 0 ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[var(--color-card-bg)] text-[var(--color-text-secondary)]">
                  <th className="w-10 px-3 py-3">
                    <button
                      onClick={() => {
                        if (allSelected) setLocalSelected(new Set())
                        else setLocalSelected(new Set(processes.map((p) => p.name)))
                      }}
                      className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                    >
                      {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">进程名</th>
                  <th className="text-left px-4 py-3 font-medium">别名</th>
                  <th className="text-left px-4 py-3 font-medium">PID</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="w-12 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc) => {
                  const isPreset = PRESET_PROCESSES.some((p) => p.name === proc.name)
                  return (
                    <tr
                      key={proc.name}
                      onClick={() => toggleSelect(proc.name)}
                      className={`border-t border-[var(--color-border)] transition-colors cursor-pointer ${
                        selectedNames.has(proc.name)
                          ? 'bg-[var(--color-accent-green)]/10'
                          : 'hover:bg-[var(--color-sidebar-hover)]'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        {selectedNames.has(proc.name) ? (
                          <CheckSquare size={16} className="text-[var(--color-accent-green)] mx-auto" />
                        ) : (
                          <Square size={16} className="text-[var(--color-text-secondary)] mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[var(--color-text-primary)] text-xs">
                        {proc.name}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-primary)]">
                        {proc.alias || '-'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[var(--color-text-primary)]">
                        {proc.pid ?? '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            proc.running
                              ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]'
                              : 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              proc.running
                                ? 'bg-[var(--color-accent-green)]'
                                : 'bg-[var(--color-text-secondary)]'
                            }`}
                          />
                          {proc.running ? '运行中' : '未运行'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {!isPreset && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemove(proc.name)
                            }}
                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 底部操作栏 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-[var(--color-text-secondary)]">
              {selectedNames.size > 0 ? (
                <span>已选择 {selectedNames.size} 个进程用于监控</span>
              ) : (
                '请至少选择一个进程'
              )}
            </div>
            <button
              onClick={handleEnter}
              disabled={selectedNames.size === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--color-accent-green)] text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              进入仪表盘
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
          {loading ? (
            <Loader2 size={32} className="animate-spin mb-3" />
          ) : (
            <Settings2 size={48} className="mb-4 opacity-50" />
          )}
          <p className="text-lg font-medium">{loading ? '加载中...' : '暂无进程'}</p>
        </div>
      )}
    </div>
  )
}
