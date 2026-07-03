import { Upload, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react'

function ImageViewer() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            <Upload size={16} />
            打开图像
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-text-secondary hover:bg-card-bg hover:text-text-primary">
            <ZoomIn size={18} />
          </button>
          <button className="rounded-lg p-2 text-text-secondary hover:bg-card-bg hover:text-text-primary">
            <ZoomOut size={18} />
          </button>
          <button className="rounded-lg p-2 text-text-secondary hover:bg-card-bg hover:text-text-primary">
            <RotateCw size={18} />
          </button>
          <button className="rounded-lg p-2 text-text-secondary hover:bg-card-bg hover:text-text-primary">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border bg-card-bg">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-content-bg">
            <Upload size={24} className="text-text-secondary" />
          </div>
          <p className="text-sm font-medium text-text-primary">拖拽图像到此处</p>
          <p className="mt-1 text-xs text-text-secondary">支持 BMP, JPEG, PNG, TIFF 格式</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card-bg px-4 py-2">
        <span className="text-xs text-text-secondary">尺寸: -- x --</span>
        <span className="text-xs text-text-secondary">格式: --</span>
        <span className="text-xs text-text-secondary">缩放: 100%</span>
        <span className="text-xs text-text-secondary">像素值: --</span>
      </div>
    </div>
  )
}

export default ImageViewer
