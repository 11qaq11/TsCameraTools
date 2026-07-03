import { useLocation } from 'react-router-dom'
import { Bell, Search, User } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': '仪表盘',
  '/viewer': '图像浏览',
  '/camera': '相机配置',
  '/process': '图像处理',
  '/settings': '系统设置',
}

function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'TsCameraTools'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card-bg px-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="搜索功能..."
            className="h-8 w-56 rounded-lg border border-border bg-content-bg pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <button className="relative rounded-lg p-2 text-text-secondary hover:bg-content-bg hover:text-text-primary">
          <Bell size={18} />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-red" />
        </button>

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
          <User size={16} />
        </button>
      </div>
    </header>
  )
}

export default Header
