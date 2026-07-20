import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import logoImg from './headerLogo.png'
import { navItems } from '../config/navigation'
import { switchTool } from '../store/reducers/ui'
import type { AppDispatch } from '../store'

// 路径到工具 ID 的映射
const pathToToolId: Record<string, string> = {
  '/': 'devices',
  '/terminal': 'terminal',
  '/memory': 'memory',
}

function Sidebar() {
  const dispatch = useDispatch<AppDispatch>()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={`flex flex-col transition-all duration-300 bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border)] ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="ThunderSoft" className="h-6 w-auto" />
            <h1 className="text-sm font-bold text-[var(--color-text-primary)] font-mono tracking-wider truncate">
              TsCameraTools
            </h1>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={() => {
              const toolId = pathToToolId[item.path] || item.id
              dispatch(switchTool(toolId))
            }}
            className={() => {
              const isActive = location.pathname === item.path
              return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--color-sidebar-active)] text-red-600 glow-accent'
                  : 'text-black hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)]'
              } ${collapsed ? 'justify-center' : ''}`
            }}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-4">
        {!collapsed && (
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
