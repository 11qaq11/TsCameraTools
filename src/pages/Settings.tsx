import { Save } from 'lucide-react'

function Settings() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card-bg p-5">
        <h3 className="mb-4 text-base font-semibold text-text-primary">通用设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">语言</p>
              <p className="text-xs text-text-secondary">设置界面显示语言</p>
            </div>
            <select className="rounded-lg border border-border bg-content-bg px-3 py-1.5 text-sm outline-none focus:border-primary">
              <option>简体中文</option>
              <option>English</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">主题</p>
              <p className="text-xs text-text-secondary">选择界面主题</p>
            </div>
            <select className="rounded-lg border border-border bg-content-bg px-3 py-1.5 text-sm outline-none focus:border-primary">
              <option>浅色</option>
              <option>深色</option>
              <option>跟随系统</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">默认图像目录</p>
              <p className="text-xs text-text-secondary">打开图像时的默认路径</p>
            </div>
            <button className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-primary hover:bg-content-bg">
              选择目录
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card-bg p-5">
        <h3 className="mb-4 text-base font-semibold text-text-primary">相机设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">自动发现</p>
              <p className="text-xs text-text-secondary">启动时自动扫描网络相机</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="h-5 w-9 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">默认像素格式</p>
              <p className="text-xs text-text-secondary">采集图像的默认像素格式</p>
            </div>
            <select className="rounded-lg border border-border bg-content-bg px-3 py-1.5 text-sm outline-none focus:border-primary">
              <option>Mono8</option>
              <option>Mono12</option>
              <option>BayerRG8</option>
              <option>RGB8</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card-bg p-5">
        <h3 className="mb-4 text-base font-semibold text-text-primary">性能设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">GPU 加速</p>
              <p className="text-xs text-text-secondary">使用 GPU 加速图像处理</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="h-5 w-9 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">处理线程数</p>
              <p className="text-xs text-text-secondary">并行处理使用的线程数量</p>
            </div>
            <select className="rounded-lg border border-border bg-content-bg px-3 py-1.5 text-sm outline-none focus:border-primary">
              <option>自动</option>
              <option>2</option>
              <option>4</option>
              <option>8</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover">
          <Save size={16} />
          保存设置
        </button>
      </div>
    </div>
  )
}

export default Settings
