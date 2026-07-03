import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, X, Download, AlertTriangle } from 'lucide-react'
import { Terminal as XTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { AdbDevice } from '../types'

function DeviceCard({ device, onConnect }: { device: AdbDevice; onConnect: (serial: string) => void }) {
  const [status, setStatus] = useState('')

  const handleRoot = async () => {
    setStatus('rooting...')
    const res = await window.electronAPI.adbRoot(device.serial)
    setStatus(res.message)
    setTimeout(() => setStatus(''), 3000)
  }

  const handleRemount = async () => {
    setStatus('remounting...')
    const res = await window.electronAPI.adbRemount(device.serial)
    setStatus(res.message)
    setTimeout(() => setStatus(''), 3000)
  }

  return (
    <div className="rounded-xl border border-border bg-card-bg p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
          <HardDrive size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{device.model}</p>
          <p className="text-xs text-text-secondary font-mono">{device.serial}</p>
        </div>
      </div>

      {status && (
        <p className="mb-3 rounded bg-content-bg px-2 py-1 text-xs text-text-secondary truncate">{status}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleRoot}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600"
        >
          <Shield size={13} />
          Root
        </button>
        <button
          onClick={handleRemount}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2 text-xs font-medium text-white hover:bg-purple-600"
        >
          <HardDrive size={13} />
          Remount
        </button>
        <button
          onClick={() => onConnect(device.serial)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover"
        >
          <Terminal size={13} />
          Connect
        </button>
      </div>
    </div>
  )
}

function ShellPanel({ shellId, serial, onClose }: { shellId: string; serial: string; onClose: () => void }) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerminal | null>(null)

  useEffect(() => {
    if (!termRef.current) return
    const term = new XTerminal({ fontSize: 13, theme: { background: '#1e293b' } })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    term.focus()
    fitAddon.fit()
    xtermRef.current = term

    term.write('adb shell connected. Type commands and press Enter.\r\n')
    term.write('Note: input is not echoed. Output appears after Enter.\r\n\r\n')

    term.onData((data) => {
      window.electronAPI.adbShellWrite(shellId, data)
    })

    const handleData = (id: string, data: string) => {
      if (id === shellId) term.write(data)
    }
    const handleExit = (id: string) => {
      if (id === shellId) term.write('\r\n[session ended]\r\n')
    }

    window.electronAPI.onShellData(handleData)
    window.electronAPI.onShellExit(handleExit)

    const resizeObs = new ResizeObserver(() => fitAddon.fit())
    resizeObs.observe(termRef.current)

    return () => {
      resizeObs.disconnect()
      term.dispose()
    }
  }, [shellId])

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card-bg overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-medium text-text-primary font-mono">adb -s {serial} shell</span>
        <button
          onClick={() => { window.electronAPI.adbShellKill(shellId); onClose() }}
          className="rounded p-1 text-text-secondary hover:text-accent-red"
        >
          <X size={14} />
        </button>
      </div>
      <div ref={termRef} className="flex-1 min-h-[300px]" />
    </div>
  )
}

function AdbNotFound({ onInstall, installing }: { onInstall: () => void; installing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-16">
      <AlertTriangle size={36} className="mb-3 text-amber-500" />
      <p className="text-sm font-medium text-text-primary">未检测到 ADB 程序</p>
      <p className="mt-1 text-xs text-text-secondary">需要安装 Android Platform Tools 才能连接设备</p>
      <button
        onClick={onInstall}
        disabled={installing}
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
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
  const [shell, setShell] = useState<{ id: string; serial: string } | null>(null)

  const checkAndRefresh = async () => {
    setLoading(true)
    const { available } = await window.electronAPI.adbCheck()
    setAdbAvailable(available)
    if (available) {
      const list = await window.electronAPI.adbDevices()
      setDevices(list)
    }
    setLoading(false)
  }

  useEffect(() => { checkAndRefresh() }, [])

  const handleInstall = async () => {
    setInstalling(true)
    const res = await window.electronAPI.adbInstall()
    setInstalling(false)
    if (res.success) {
      setAdbAvailable(true)
      checkAndRefresh()
    }
  }

  const handleConnect = async (serial: string) => {
    const id = await window.electronAPI.adbShellStart(serial)
    if (id) setShell({ id, serial })
  }

  if (adbAvailable === null) {
    return <div className="flex items-center justify-center py-16 text-sm text-text-secondary">检测中...</div>
  }

  if (!adbAvailable) {
    return <AdbNotFound onInstall={handleInstall} installing={installing} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
        </p>
        <button
          onClick={checkAndRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-card-bg px-3 py-2 text-sm font-medium text-text-primary hover:bg-content-bg disabled:opacity-50"
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
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16">
          <HardDrive size={32} className="mb-3 text-text-secondary" />
          <p className="text-sm text-text-secondary">请连接 Android 设备并确保 USB 调试已开启</p>
        </div>
      )}

      {shell && (
        <ShellPanel shellId={shell.id} serial={shell.serial} onClose={() => setShell(null)} />
      )}
    </div>
  )
}

export default Devices
