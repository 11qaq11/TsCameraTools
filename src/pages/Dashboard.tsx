import { Camera, Image, Wand2, Activity, FolderOpen, Cpu } from 'lucide-react'

const stats = [
  { label: '已连接相机', value: '2', icon: <Camera size={20} />, color: 'bg-blue-100 text-blue-600' },
  { label: '图像文件', value: '1,284', icon: <Image size={20} />, color: 'bg-green-100 text-green-600' },
  { label: '处理任务', value: '3', icon: <Wand2 size={20} />, color: 'bg-purple-100 text-purple-600' },
  { label: '系统状态', value: '正常', icon: <Activity size={20} />, color: 'bg-emerald-100 text-emerald-600' },
]

const recentProjects = [
  { name: '产线A-缺陷检测', time: '2分钟前', status: 'active' },
  { name: '标定图像采集', time: '1小时前', status: 'completed' },
  { name: '尺寸测量模板', time: '3小时前', status: 'completed' },
  { name: 'OCR字符识别', time: '昨天', status: 'idle' },
]

const quickActions = [
  { label: '打开图像', icon: <FolderOpen size={18} />, desc: '浏览和查看图像文件' },
  { label: '连接相机', icon: <Camera size={18} />, desc: '配置和连接工业相机' },
  { label: '图像处理', icon: <Wand2 size={18} />, desc: '创建图像处理流程' },
  { label: 'GPU 状态', icon: <Cpu size={18} />, desc: '查看硬件加速状态' },
]

function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border border-border bg-card-bg p-4"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card-bg p-5">
          <h3 className="mb-4 text-base font-semibold text-text-primary">快速操作</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary-light"
              >
                <div className="text-primary">{action.icon}</div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{action.label}</p>
                  <p className="text-xs text-text-secondary">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card-bg p-5">
          <h3 className="mb-4 text-base font-semibold text-text-primary">最近项目</h3>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.name}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-content-bg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      project.status === 'active'
                        ? 'bg-accent-green'
                        : project.status === 'completed'
                        ? 'bg-primary'
                        : 'bg-text-secondary'
                    }`}
                  />
                  <span className="text-sm font-medium text-text-primary">{project.name}</span>
                </div>
                <span className="text-xs text-text-secondary">{project.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card-bg p-5">
        <h3 className="mb-4 text-base font-semibold text-text-primary">系统信息</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-content-bg p-4">
            <p className="text-sm text-text-secondary">CPU 使用率</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">23%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-border">
              <div className="h-2 w-[23%] rounded-full bg-accent-green" />
            </div>
          </div>
          <div className="rounded-lg bg-content-bg p-4">
            <p className="text-sm text-text-secondary">内存使用</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">4.2 GB / 16 GB</p>
            <div className="mt-2 h-2 w-full rounded-full bg-border">
              <div className="h-2 w-[26%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="rounded-lg bg-content-bg p-4">
            <p className="text-sm text-text-secondary">GPU 使用率</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">45%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-border">
              <div className="h-2 w-[45%] rounded-full bg-accent-purple" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
