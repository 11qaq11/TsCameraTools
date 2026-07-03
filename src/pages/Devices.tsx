import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Shield, HardDrive, Terminal, X } from 'lucide-react'
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
    fitAddon.fit()
    xtermRef.current = term

    term.onData((data) => {
      window.electronAPI.adbShellWrite(shellId, data)
    })

    const handleData = (id: string, data: string) => {
      if (id === shellId) term.write(data)
    }
    const handleExit = (id: string) => {
      if (id === shellId) {
        term.write('\r\n[session ended]\r\n')
      }
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

function Devices() {
  const [devices, setDevices] = useState<AdbDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [shell, setShell] = useState<{ id: string; serial: string } | null>(null)

  const refresh = async () => {
    setLoading(true)
    const list = await window.electronAPI.adbDevices()
    setDevices(list)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleConnect = async (serial: string) => {
    const id = await window.electronAPI.adbShellStart(serial)
    setShell({ id, serial })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {devices.length > 0 ? `已检测到 ${devices.length} 个设备` : '未检测到设备'}
        </p>
        <button
          onClick={refresh}
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
          <p className="text-sm text-text-secondary">请连接 Android 设备并确保 ADB 已启用</p>
        </div>
      )}

      {shell && (
        <ShellPanel shellId={shell.id} serial={shell.serial} onClose={() => setShell(null)} />
      )}
    </div>
  )
}

export default Devices
