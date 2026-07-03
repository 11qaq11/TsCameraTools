import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Image,
  Camera,
  Wand2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import type { NavItem } from '../types'

const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={20} />, path: '/' },
  { id: 'viewer', label: '图像浏览', icon: <Image size={20} />, path: '/viewer' },
  { id: 'camera', label: '相机配置', icon: <Camera size={20} />, path: '/camera' },
  { id: 'process', label: '图像处理', icon: <Wand2 size={20} />, path: '/process' },
  { id: 'settings', label: '系统设置', icon: <Settings size={20} />, path: '/settings' },
]

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={`flex flex-col bg-sidebar-bg transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <h1 className="text-lg font-bold text-text-sidebar-active truncate">
            TsCameraTools
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-text-sidebar hover:bg-sidebar-hover hover:text-text-sidebar-active"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={() => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
              return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-sidebar hover:bg-sidebar-hover hover:text-text-sidebar-active'
              } ${collapsed ? 'justify-center' : ''}`
            }}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-hover p-4">
        {!collapsed && (
          <p className="text-xs text-text-secondary">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
