import { RefreshCw, Play, Square, Settings2 } from 'lucide-react'

const cameras = [
  { id: 1, name: 'Basler acA1300-30gc', status: 'connected', ip: '192.168.1.101' },
  { id: 2, name: 'Hikvision MV-CS050-10GC', status: 'connected', ip: '192.168.1.102' },
  { id: 3, name: 'FLIR BFS-U3-50S5C', status: 'disconnected', ip: '192.168.1.103' },
]

function CameraConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">管理和配置已连接的工业相机</p>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card-bg px-3 py-2 text-sm font-medium text-text-primary hover:bg-content-bg">
          <RefreshCw size={14} />
          扫描设备
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cameras.map((camera) => (
          <div key={camera.id} className="rounded-xl border border-border bg-card-bg p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    camera.status === 'connected' ? 'bg-accent-green' : 'bg-accent-red'
                  }`}
                />
                <span className="text-sm font-medium text-text-primary">{camera.name}</span>
              </div>
            </div>
            <p className="mb-4 text-xs text-text-secondary">IP: {camera.ip}</p>

            <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-content-bg">
              <span className="text-xs text-text-secondary">
                {camera.status === 'connected' ? '预览画面' : '设备离线'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-green px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                disabled={camera.status !== 'connected'}
              >
                <Play size={12} />
                采集
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-red px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                disabled={camera.status !== 'connected'}
              >
                <Square size={12} />
                停止
              </button>
              <button className="flex items-center justify-center rounded-lg border border-border p-2 text-text-secondary hover:bg-content-bg">
                <Settings2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CameraConfig
