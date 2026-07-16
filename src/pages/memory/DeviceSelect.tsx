import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, HardDrive, AlertTriangle, ChevronRight, Shield, Loader2 } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'
import { setDevice, setRoot, setStage } from '../../store/memory'
import type { DeviceInfo } from '../../types/memory'

interface AdbDevice {
  serial: string
  model: string
  status: 'device' | 'offline' | 'unauthorized'
}

export default function DeviceSelect() {
  const dispatch = useDispatch()
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [entering, setEntering] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const checkAdb = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/adb/check')
      const data = await res.json() as { available: boolean }
      setAdbAvailable(data.available)
      if (data.available) {
        await refreshDevices()
      }
    } catch (err) {
      logger.error('DeviceSelect', 'ADB check failed:', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }, [])

  const refreshDevices = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/adb/devices')
      const data = await res.json() as { devices: AdbDevice[] }
      setDevices(data.devices || [])
    } catch (err) {
      logger.error('DeviceSelect', 'Failed to refresh devices:', err)
    }
    setLoading(false)
  }

  const handleEnter = async () => {
    const device = devices.find(d => d.serial === selected)
    if (!device || device.status !== 'device') return

    setEntering(true)
    setStatusMsg('正在检测 Root 权限...')

    const info: DeviceInfo = { serial: device.serial, state: device.status, model: device.model }
    dispatch(setDevice(info))

    try {
      const res = await fetchWithAuth(`/api/adb/root/${device.serial}`, { method: 'POST' })
      const data = await res.json() as { success: boolean; message: string }
      dispatch(setRoot(data.success))
      if (!data.success) {
        logger.warn('DeviceSelect', `Root check: ${data.message}`)
      }
    } catch (err) {
      logger.error('DeviceSelect', 'Root check failed:', err)
      dispatch(setRoot(false))
    }

    setStatusMsg('')
    setEntering(false)
    dispatch(setStage('process'))
  }

  useEffect(() => {
    checkAdb()
  }, [checkAdb])

  // ADB 检测中
  if (adbAvailable === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-[var(--color-text-secondary)] mr-2" />
        <span className="text-[var(--color-text-secondary)]">检测 ADB 环境...</span>
      </div>
    )
  }

  // ADB 不可用
  if (!adbAvailable) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/5 px-12 py-16">
          <AlertTriangle size={36} className="mb-3 text-[var(--color-accent-orange)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">未检测到 ADB 程序</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">需要安装 Android Platform Tools 才能连接设备</p>
        </div>
      </div>
    )
  }

  const selectedDevice = devices.find(d => d.serial === selected)
  const canEnter = selectedDevice?.status === 'device' && !entering

  return (
    <div className="flex flex-col h-full p-6">
      {/* 标题区 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">选择设备</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {loading ? '正在刷新...' : devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
          </p>
        </div>
        <button
          onClick={refreshDevices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-sidebar-hover)] border border-[var(--color-border)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* 设备表格 */}
      {devices.length > 0 ? (
        <div className="flex-1 flex flex-col">
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-card-bg)] text-[var(--color-text-secondary)]">
                  <th className="text-left px-4 py-3 font-medium">序列号</th>
                  <th className="text-left px-4 py-3 font-medium">型号</th>
                  <th className="text-left px-4 py-3 font-medium">状态</th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr
                    key={device.serial}
                    onClick={() => device.status === 'device' && setSelected(device.serial)}
                    className={`border-t border-[var(--color-border)] transition-colors ${
                      device.status !== 'device'
                        ? 'opacity-50 cursor-not-allowed'
                        : selected === device.serial
                          ? 'bg-[var(--color-accent-green)]/10 cursor-pointer'
                          : 'hover:bg-[var(--color-sidebar-hover)] cursor-pointer'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[var(--color-text-primary)]">{device.serial}</td>
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">{device.model}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        device.status === 'device' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]' :
                        device.status === 'unauthorized' ? 'bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]' :
                        'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          device.status === 'device' ? 'bg-[var(--color-accent-green)]' :
                          device.status === 'unauthorized' ? 'bg-[var(--color-accent-orange)]' :
                          'bg-[var(--color-accent-red)]'
                        }`} />
                        {device.status === 'device' ? '在线' : device.status === 'unauthorized' ? '未授权' : '离线'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {selected === device.serial && (
                        <ChevronRight size={16} className="text-[var(--color-accent-green)]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 底部操作栏 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-[var(--color-text-secondary)]">
              {selectedDevice ? (
                <span className="flex items-center gap-1.5">
                  <HardDrive size={14} />
                  已选择: {selectedDevice.model || selectedDevice.serial}
                  {statusMsg && <span className="text-[var(--color-accent-orange)] ml-2">{statusMsg}</span>}
                </span>
              ) : (
                '请从列表中选择一台在线设备'
              )}
            </div>
            <button
              onClick={handleEnter}
              disabled={!canEnter}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--color-accent-green)] text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {entering ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Shield size={16} />
              )}
              {entering ? '检测中...' : '进入工具'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
          <HardDrive size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">暂无设备</p>
          <p className="text-sm mt-1">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}
    </div>
  )
}
