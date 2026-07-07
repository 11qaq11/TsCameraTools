import { NavLink, useLocation } from 'react-router-dom'
import { Smartphone, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import logoImg from './headerLogo.png'

const navItems = [
  { id: 'devices', label: '设备连接', icon: <Smartphone size={20} />, path: '/' },
]

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={`flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      style={{ backgroundColor: '#0F172A', borderRight: '1px solid #334155' }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="ThunderSoft" className="h-6 w-auto" />
            <h1 className="text-sm font-bold text-white font-mono tracking-wider truncate">
              TsCameraTools
            </h1>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-gray-400 hover:bg-[#1E293B] hover:text-white cursor-pointer"
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
              const isActive = location.pathname === item.path
              return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[#22C55E] text-white glow-accent'
                  : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#334155] p-4">
        {!collapsed && (
          <p className="text-xs text-[#94A3B8] font-mono">v0.1.0</p>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
