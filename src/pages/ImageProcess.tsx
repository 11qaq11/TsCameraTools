import { Plus, Play, Trash2, GripVertical } from 'lucide-react'

const processingSteps = [
  { id: 1, name: '灰度转换', type: 'filter', enabled: true },
  { id: 2, name: '高斯模糊', type: 'filter', params: 'kernel: 5x5', enabled: true },
  { id: 3, name: '边缘检测 (Canny)', type: 'detection', params: 'low: 50, high: 150', enabled: true },
  { id: 4, name: '形态学闭运算', type: 'morphology', params: 'kernel: 3x3', enabled: false },
]

const availableTools = [
  { category: '滤波', items: ['均值滤波', '中值滤波', '高斯模糊', '双边滤波'] },
  { category: '边缘检测', items: ['Canny', 'Sobel', 'Laplacian', 'Roberts'] },
  { category: '形态学', items: ['腐蚀', '膨胀', '开运算', '闭运算'] },
  { category: '阈值', items: ['全局阈值', '自适应阈值', 'OTSU'] },
  { category: '几何变换', items: ['旋转', '缩放', '仿射变换', '透视变换'] },
]

function ImageProcess() {
  return (
    <div className="flex h-full gap-4">
      <div className="w-64 shrink-0 space-y-4 overflow-auto">
        <div className="rounded-xl border border-border bg-card-bg p-4">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">工具箱</h3>
          <div className="space-y-3">
            {availableTools.map((group) => (
              <div key={group.category}>
                <p className="mb-1.5 text-xs font-medium text-text-secondary">{group.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      className="rounded border border-border px-2 py-1 text-xs text-text-primary transition-colors hover:border-primary hover:bg-primary-light"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">处理流程</h3>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-content-bg">
              <Plus size={14} />
              添加步骤
            </button>
            <button className="flex items-center gap-1 rounded-lg bg-accent-green px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              <Play size={14} />
              执行
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {processingSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border bg-card-bg p-3 ${
                step.enabled ? 'border-border' : 'border-border opacity-50'
              }`}
            >
              <GripVertical size={14} className="cursor-grab text-text-secondary" />
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{step.name}</p>
                {step.params && (
                  <p className="text-xs text-text-secondary">{step.params}</p>
                )}
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked={step.enabled} />
                <div className="h-5 w-9 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
              </label>
              <button className="rounded p-1 text-text-secondary hover:text-accent-red">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1 rounded-xl border border-border bg-card-bg p-4">
          <p className="mb-2 text-xs font-medium text-text-secondary">处理结果预览</p>
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-secondary">执行处理流程后显示结果</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageProcess
