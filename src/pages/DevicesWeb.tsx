// DevicesWeb.tsx - Web 版设备管理页面

import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RefreshCw, Shield, HardDrive, Terminal, Download, AlertTriangle } from 'lucide-react'
import { fetchWithAuth } from '../utils/auth'
import { logger } from '../utils/logger'
import XtermTerminal from '../components/terminal/XtermTerminal'
import type { RootState, AppDispatch } from '../store'
import { saveToolSnapshot } from '../store/reducers/ui'

interface AdbDevice {
  serial: string
  model: string
  status: 'device' | 'offline' | 'unauthorized'
}

function DeviceCard({ device, onConnect, connecting }: { 
  device: AdbDevice
  onConnect: (serial: string) => void
  connecting: boolean
}) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    logger.info('Device', `Root device ${device.serial}`)
    setStatus('rooting...')
    const res = await fetchWithAuth(`/api/adb/root/${device.serial}`, { method: 'POST' })
    const data = await res.json() as { success: boolean; message: string }
    setStatus(data.message)
    logger.info('Device', `Root result: ${data.message}`)
    setTimeout(() => setStatus(''), 3000)
  }

  const handleRemount = async () => {
    logger.info('Device', `Remount device ${device.serial}`)
    setStatus('remounting...')
    const res = await fetchWithAuth(`/api/adb/remount/${device.serial}`, { method: 'POST' })
    const data = await res.json() as { success: boolean; message: string }
    setStatus(data.message)
    logger.info('Device', `Remount result: ${data.message}`)
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 shadow-sm hover:shadow-lg hover:shadow-[var(--color-accent-green)]/10 hover:border-[var(--color-accent-green)] transition-all duration-300">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{device.model}</p>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">{device.serial}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          device.status === 'device' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]' :
          device.status === 'unauthorized' ? 'bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]' :
          'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]'
        }`}>
          {device.status === 'device' ? '在线' : device.status === 'unauthorized' ? '未授权' : '离线'}
        </span>
      </div>

      {status && (
        <p className="mb-3 rounded bg-[var(--color-background)] px-2 py-1 text-xs text-[var(--color-text-secondary)] truncate font-mono">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-orange)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-orange)]/90 transition-colors cursor-pointer"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-purple)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-purple)]/90 transition-colors cursor-pointer"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          disabled={connecting || device.status !== 'device'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-green)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Terminal size={13} />
          {connecting ? '连接中...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

function AdbNotFound({ onInstall, installing }: { onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 py-16">
      <AlertTriangle size={36} className="mb-3 text-[var(--color-accent-orange)]" />
      <p className="text-sm font-medium text-[var(--color-text-primary)]">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-accent-green)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 disabled:opacity-50 cursor-pointer"
      >
        <Download size={16} className={installing ? 'animate-bounce' : ''} />
        {installing ? '正在安装...' : '一键安装 ADB'}
      </button>
    </div>
  )
}

function DevicesWeb() {
  const dispatch = useDispatch<AppDispatch>()
  const toolSnapshots = useSelector((state: RootState) => state.ui.toolSnapshots)
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [ttydAvailable, setTtydAvailable] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  // 从快照恢复 activeShell 状态
  const [activeShell, setActiveShell] = useState<{ serial: string } | null>(
    toolSnapshots.devices?.selectedDevice ? { serial: toolSnapshots.devices.selectedDevice } : null
  )

  // 保存状态快照
  const saveSnapshot = useCallback(() => {
    dispatch(saveToolSnapshot({
      toolId: 'devices',
      snapshot: {
        selectedDevice: activeShell?.serial || null
      }
    }))
  }, [dispatch, activeShell])

  // 组件卸载时保存状态
  useEffect(() => {
    return () => {
      saveSnapshot()
    }
  }, [saveSnapshot])

  useEffect(() => {
    checkAdb()
    checkTtyd()
  }, [])

  const checkTtyd = async () => {
    try {
      const res = await fetchWithAuth('/api/ttyd/check')
      const data = await res.json() as { available: boolean }
      setTtydAvailable(data.available)
    } catch {
      setTtydAvailable(false)
    }
  }

  const checkAdb = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/adb/check')
      const data = await res.json() as { available: boolean }
      setAdbAvailable(data.available)
      if (data.available) {
        await refreshDevices()
      }
    } catch (err) {
      logger.error('DevicesWeb', 'ADB check failed:', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }

  const refreshDevices = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/adb/devices')
      const data = await res.json() as { devices: AdbDevice[] }
      setDevices(data.devices || [])
      logger.info('DevicesWeb', 'Devices refreshed:', { count: data.devices?.length || 0 })
    } catch (err) {
      logger.error('DevicesWeb', 'Failed to refresh devices:', err)
    }
    setLoading(false)
  }

  const handleConnect = async (serial: string) => {
    setConnecting(serial)
    setActiveShell({ serial })
    setConnecting(null)
    // 保存连接状态
    dispatch(saveToolSnapshot({
      toolId: 'devices',
      snapshot: { selectedDevice: serial }
    }))
  }

  const handleDisconnect = () => {
    setActiveShell(null)
    // 清除连接状态
    dispatch(saveToolSnapshot({
      toolId: 'devices',
      snapshot: { selectedDevice: null }
    }))
  }

  if (adbAvailable === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-text-secondary)]">检测 ADB 环境...</div>
      </div>
    )
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={() => {}} installing={false} />
  }

  if (ttydAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-[var(--color-accent-orange)] mb-2">ttyd 终端组件不可用</p>
        <p className="text-sm text-[var(--color-text-secondary)]">请确保 bin/ttyd/ttyd.exe 存在</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {activeShell ? (
        <XtermTerminal
          type="adb"
          serial={activeShell.serial}
          onClose={handleDisconnect}
        />
      ) : (
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">设备列表</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
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

          {devices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map(device => (
                <DeviceCard
                  key={device.serial}
                  device={device}
                  onConnect={handleConnect}
                  connecting={connecting === device.serial}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100%-100px)] text-[var(--color-text-secondary)]">
              <HardDrive size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无设备</p>
              <p className="text-sm mt-1">请连接 Android 设备并确保 USB 调试已开启</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DevicesWeb
