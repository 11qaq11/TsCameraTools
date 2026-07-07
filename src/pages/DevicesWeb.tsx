// DevicesWeb.tsx - Web 版设备管理页面
// 使用 Hyper 风格的终端组件

import { useState, useEffect } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, Download, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import { fetchWithAuth } from '../utils/auth'
import { logger } from '../utils/logger'
import HyperTerminal from '../components/terminal/HyperTerminal'
import ErrorBoundary from '../components/ErrorBoundary'

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
    <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5 shadow-sm hover:shadow-lg hover:shadow-[#22C55E]/10 hover:border-[#22C55E] transition-all duration-300">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{device.model}</p>
          <p className="text-xs text-[#94A3B8] font-mono">{device.serial}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          device.status === 'device' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
          device.status === 'unauthorized' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
          'bg-[#EF4444]/10 text-[#EF4444]'
        }`}>
          {device.status === 'device' ? '在线' : device.status === 'unauthorized' ? '未授权' : '离线'}
        </span>
      </div>

      {status && (
        <p className="mb-3 rounded bg-[#0F172A] px-2 py-1 text-xs text-[#94A3B8] truncate font-mono">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-2 text-xs font-medium text-white hover:bg-[#F59E0B]/90 transition-colors cursor-pointer"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] px-3 py-2 text-xs font-medium text-white hover:bg-[#8B5CF6]/90 transition-colors cursor-pointer"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          disabled={connecting || device.status !== 'device'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#22C55E] px-3 py-2 text-xs font-medium text-white hover:bg-[#22C55E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#F59E0B] bg-[#F59E0B]/10 py-16">
      <AlertTriangle size={36} className="mb-3 text-[#F59E0B]" />
      <p className="text-sm font-medium text-white">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-[#94A3B8]">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-[#22C55E] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#22C55E]/90 disabled:opacity-50 cursor-pointer"
      >
        <Download size={16} className={installing ? 'animate-bounce' : ''} />
        {installing ? '正在安装...' : '一键安装 ADB'}
      </button>
    </div>
  )
}

function DevicesWeb() {
  const { user } = useAuth()
  const { socket, emit, on, off } = useSocket()
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [activeShell, setActiveShell] = useState<{ serial: string; sessionId: string } | null>(null)

  useEffect(() => {
    checkAdb()
  }, [])

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
    if (!socket) return
    setConnecting(serial)
    try {
      emit('shell:start', { serial, userId: user?.id || 'anonymous' })
      // 使用 on 代替 once，然后在回调中移除监听
      const onStarted = (data: unknown) => {
        const { sessionId, serial: deviceSerial } = data as { sessionId: string; serial: string }
        setActiveShell({ serial: deviceSerial, sessionId })
        setConnecting(null)
        logger.info('DevicesWeb', 'Shell started:', data)
        off('shell:started', onStarted)
        off('shell:error', onError)
      }
      const onError = (data: unknown) => {
        const { error } = data as { error: string }
        logger.error('DevicesWeb', 'Shell error:', error)
        setConnecting(null)
        off('shell:started', onStarted)
        off('shell:error', onError)
      }
      on('shell:started', onStarted)
      on('shell:error', onError)
    } catch (err) {
      logger.error('DevicesWeb', 'Failed to connect:', err)
      setConnecting(null)
    }
  }

  const handleDisconnect = () => {
    if (socket && activeShell) {
      emit('shell:kill', { sessionId: activeShell.sessionId })
      setActiveShell(null)
    }
  }

  if (adbAvailable === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#94A3B8]">检测 ADB 环境...</div>
      </div>
    )
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={() => {}} installing={false} />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Device list or Terminal */}
      {activeShell ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></div>
              <span className="text-sm font-mono text-[#94A3B8]">
                {activeShell.serial}
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors cursor-pointer"
            >
              断开连接
            </button>
          </div>
          <div className="flex-1">
            <ErrorBoundary>
              <HyperTerminal
                shellId={activeShell.sessionId}
                serial={activeShell.serial}
                socket={socket}
                onClose={handleDisconnect}
              />
            </ErrorBoundary>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">设备列表</h3>
              <p className="text-sm text-[#94A3B8]">
                {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
              </p>
            </div>
            <button
              onClick={refreshDevices}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E293B] text-white rounded-lg hover:bg-[#334155] border border-[#334155] transition-colors disabled:opacity-50 cursor-pointer"
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
            <div className="flex flex-col items-center justify-center h-[calc(100%-100px)] text-[#94A3B8]">
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
