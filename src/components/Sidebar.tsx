import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import logoImg from './headerLogo.png'
import { navItems } from '../config/navigation'
import { adminNavItems } from '../config/adminNav'
import { switchTool, toggleTool } from '../store/reducers/ui'
import type { RootState, AppDispatch } from '../store'

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI
const allItems = isElectron ? navItems : adminNavItems

const pathToToolId: Record<string, string> = isElectron ? {
  '/': 'devices',
  '/memory': 'memory',
  '/feedback': 'feedback',
} : {
  '/admin/users': 'admin-users',
  '/admin/feedback': 'admin-feedback',
  '/admin/logs': 'admin-logs',
  '/admin/config': 'admin-config',
}

function Sidebar() {
  const dispatch = useDispatch<AppDispatch>()
  const enabledTools = useSelector((state: RootState) => state.ui.enabledTools)
  const [collapsed, setCollapsed] = useState(false)
  const [showMarket, setShowMarket] = useState(false)
  const location = useLocation()

  const visibleItems = isElectron
    ? allItems.filter(item => enabledTools.includes(item.id))
    : allItems

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
              TsCameraTools{isElectron ? '' : ' Admin'}
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
        {visibleItems.map((item) => (
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

      {isElectron && (
        <div className="border-t border-[var(--color-border)]">
          {!collapsed && (
            <div className="p-2">
              <button
                onClick={() => setShowMarket(!showMarket)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer rounded hover:bg-[var(--color-sidebar-hover)]"
              >
                <Settings2 size={14} />
                <span>工具市场</span>
              </button>
              {showMarket && (
                <div className="mt-1 space-y-0.5 px-1">
                  {navItems.map(item => (
                    <label key={item.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--color-sidebar-hover)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledTools.includes(item.id)}
                        onChange={() => dispatch(toggleTool(item.id))}
                        className="w-3.5 h-3.5 accent-[var(--color-accent-green)]"
                      />
                      <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-[var(--color-border)] p-4">
        {!collapsed && (
          <p className="text-xs text-[var(--color-text-secondary)] font-mono">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
