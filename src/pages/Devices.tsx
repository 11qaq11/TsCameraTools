import { useState, useEffect } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, Download, AlertTriangle } from 'lucide-react'
import type { AdbDevice } from '../types'
import { logger } from '../utils/logger'
import ShellPanel from '../components/terminal/ShellPanel'

function DeviceCard({ device, onConnect }: { device: AdbDevice; onConnect: (serial: string) => void }) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    try {
      setStatus('rooting...')
      const res = await window.electronAPI.adbRoot(device.serial)
      setStatus(res.message)
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      logger.error('DeviceCard', 'adbRoot failed', err)
      setStatus('root failed')
    }
  }

  const handleRemount = async () => {
    try {
      setStatus('remounting...')
      const res = await window.electronAPI.adbRemount(device.serial)
      setStatus(res.message)
      setTimeout(() => setStatus(''), 3000)
    } catch (err) {
      logger.error('DeviceCard', 'adbRemount failed', err)
      setStatus('remount failed')
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] p-5 hover:border-[var(--color-accent-green)] transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-accent-green)]/10">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{device.model}</p>
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">{device.serial}</p>
        </div>
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-green)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-green)]/90 transition-colors cursor-pointer"
        >
          <Terminal size={13} />
          Connect
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

function Devices() {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [adbAvailable, setAdbAvailable] = useState<boolean | null>(null)
  const [installing, setInstalling] = useState(false)
  const [shell, setShell] = useState<{ id: string; serial: string; model: string } | null>(null)

  const checkAndRefresh = async () => {
    setLoading(true)
    logger.info('Devices', 'Starting ADB check...')
    try {
      const { available } = await window.electronAPI.adbCheck()
      logger.info('Devices', 'ADB check result:', { available })
      setAdbAvailable(available)
      if (available) {
        logger.info('Devices', 'Fetching devices...')
        const list = await window.electronAPI.adbDevices()
        logger.info('Devices', 'Devices found:', { count: list.length, devices: list })
        setDevices(list)
      }
    } catch (err) {
      logger.error('Devices', 'ADB check failed:', err)
      setAdbAvailable(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    logger.info('Devices', 'Component mounted, scheduling ADB check...')
    const timer = setTimeout(() => {
      logger.info('Devices', 'Executing ADB check...')
      checkAndRefresh()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    try {
      setInstalling(true)
      const res = await window.electronAPI.adbInstall()
      setInstalling(false)
      if (res.success) {
        setAdbAvailable(true)
        checkAndRefresh()
      }
    } catch (err) {
      logger.error('Devices', 'ADB install failed', err)
      setInstalling(false)
    }
  }

  const handleConnect = async (serial: string) => {
    try {
      const id = await window.electronAPI.adbShellStart(serial)
      const device = devices.find((d) => d.serial === serial)
      if (id) setShell({ id, serial, model: device?.model || serial })
    } catch (err) {
      logger.error('Devices', 'Shell start failed', err)
    }
  }

  const handleReconnect = async () => {
    if (!shell) return
    try {
      const newId = await window.electronAPI.adbShellReconnect(shell.serial, shell.id)
      if (newId) setShell({ ...shell, id: newId })
    } catch (err) {
      logger.error('Devices', 'Shell reconnect failed', err)
    }
  }

  if (adbAvailable === null) {
    return <div className="flex items-center justify-center py-16 text-sm text-[var(--color-text-secondary)]">检测中...</div>
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="flex flex-col h-full gap-6 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
        </p>
        <button
          onClick={checkAndRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-bg)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          刷新设备
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <DeviceCard key={d.serial} device={d} onConnect={handleConnect} />
        ))}
      </div>

      {devices.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] py-16">
          <HardDrive size={32} className="mb-3 text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && (
        <ShellPanel type="adb" shellId={shell.id} serial={shell.serial} model={shell.model} onClose={() => setShell(null)} onReconnect={handleReconnect} />
      )}
    </div>
  )
}

export default Devices
