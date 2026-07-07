// DevicesWeb.tsx - Web 版设备管理页面
// 使用 Hyper 风格的终端组件

import { useState, useEffect } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, Download, AlertTriangle, LogOut } from 'lucide-react'
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{device.model}</p>
          <p className="text-xs text-gray-500 font-mono">{device.serial}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          device.status === 'device' ? 'bg-green-100 text-green-700' :
          device.status === 'unauthorized' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {device.status === 'device' ? '在线' : device.status === 'unauthorized' ? '未授权' : '离线'}
        </span>
      </div>

      {status && (
        <p className="mb-3 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 truncate">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          disabled={connecting || device.status !== 'device'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-16">
      <AlertTriangle size={36} className="mb-3 text-amber-500" />
      <p className="text-sm font-medium text-gray-900">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-gray-500">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Download size={16} className={installing ? 'animate-bounce' : ''} />
        {installing ? '正在安装...' : '一键安装 ADB'}
      </button>
    </div>
  )
}

function Devices() {
  const { user, logout } = useAuth()
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [shell, setShell] = useState<{ id: string; serial: string; model: string } | null>(null)

  const { socket, connected } = useSocket()

  const checkAndRefresh = async () => {
    logger.info('Devices', 'Checking ADB availability...')
    setLoading(true)
    try {
      const checkRes = await fetchWithAuth('/api/adb/check')
      const checkData = await checkRes.json() as { available: boolean }
      setAdbAvailable(checkData.available)
      logger.info('Devices', `ADB available: ${checkData.available}`)

      if (checkData.available) {
        logger.info('Devices', 'Fetching device list...')
        const devicesRes = await fetchWithAuth('/api/adb/devices')
        const devicesData = await devicesRes.json() as { devices: AdbDevice[] }
        setDevices(devicesData.devices)
        logger.info('Devices', `Found ${devicesData.devices.length} device(s)`)
      }
    } catch (err) {
      logger.error('Devices', 'ADB check failed', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    logger.info('Devices', 'Page mounted')
    checkAndRefresh()
  }, [])

  const handleInstall = async () => {
    logger.info('Devices', 'Installing ADB...')
    setInstalling(true)
    setTimeout(() => {
      setInstalling(false)
      setAdbAvailable(true)
      logger.info('Devices', 'ADB installed')
      checkAndRefresh()
    }, 2000)
  }

  const handleConnect = async (serial: string) => {
    logger.info('Devices', `Connecting to ${serial}...`)
    
    if (!socket) {
      logger.error('Devices', 'WebSocket not connected')
      alert('WebSocket 未连接，请等待连接后重试')
      return
    }
    if (!connected) {
      logger.error('Devices', 'Server not ready')
      alert('服务器未就绪，请稍后重试')
      return
    }
    
    setConnecting(true)
    const device = devices.find((d) => d.serial === serial)
    const model = device?.model || serial
    logger.info('Devices', `Emitting shell:start for ${serial}`)

    socket.emit('shell:start', { serial, userId: user?.id })

    const handleStarted = (data: { sessionId: string; serial: string }) => {
      logger.info('Devices', `Shell session started: ${data.sessionId}`)
      setShell({ id: data.sessionId, serial, model })
      setConnecting(false)
      socket.off('shell:started', handleStarted)
    }

    const handleError = (data: { sessionId: string; error: string }) => {
      logger.error('Devices', `Shell error: ${data.error}`)
      setConnecting(false)
      socket.off('shell:error', handleError)
    }

    socket.once('shell:started', handleStarted)
    socket.on('shell:error', handleError)
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (connecting) {
        logger.warn('Devices', 'Connection timeout')
        setConnecting(false)
        socket.off('shell:started', handleStarted)
        socket.off('shell:error', handleError)
      }
    }, 5000)
  }

  if (adbAvailable === null) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">检测 ADB...</span>
      </div>
    )
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
          </p>
          {user && (
            <p className="text-xs text-gray-400 mt-1">欢迎, {user.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs text-gray-500">{connected ? '已连接' : '未连接'}</span>
          </div>
          <button
            onClick={() => { logger.info('Devices', 'Manual refresh'); checkAndRefresh() }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新设备
          </button>
          <button
            onClick={() => { logger.info('Devices', 'Logout'); logout() }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <DeviceCard key={d.serial} device={d} onConnect={handleConnect} connecting={connecting} />
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16">
          <HardDrive size={32} className="mb-3 text-gray-400" />
          <p className="text-sm text-gray-500">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && socket && (
        <ErrorBoundary>
          <HyperTerminal
            shellId={shell.id}
            serial={shell.serial}
            socket={socket}
            onClose={() => { logger.info('Devices', 'Shell closed'); setShell(null) }}
          />
        </ErrorBoundary>
      )}
    </div>
  )
}

export default Devices
