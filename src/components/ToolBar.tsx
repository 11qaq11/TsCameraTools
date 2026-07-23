import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { Smartphone, MemoryStick } from 'lucide-react'
import type { RootState, AppDispatch } from '../store'
import { switchTool } from '../store/reducers/ui'

interface ToolInfo {
  id: string
  label: string
  icon: React.ReactNode
  path: string
}

const tools: ToolInfo[] = [
  { id: 'devices', label: '设备连接', icon: <Smartphone size={16} />, path: '/' },
  { id: 'memory', label: '内存分析', icon: <MemoryStick size={16} />, path: '/memory' },
]

const toolMap = new Map(tools.map(t => [t.id, t]))

export default function ToolBar() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const recentTools = useSelector((state: RootState) => state.ui.recentTools)

  const handleToolClick = (toolId: string) => {
    const tool = toolMap.get(toolId)
    if (!tool) return
    
    dispatch(switchTool(toolId))
    navigate(tool.path)
  }

  // 根据当前路径确定活跃工具
  const currentToolId = tools.find(t => t.path === location.pathname)?.id || 'devices'
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

  if (!isElectron) return null

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-[var(--color-card-bg)] border-b border-[var(--color-border)]">
      <span className="text-xs text-[var(--color-text-secondary)] mr-2">最近使用:</span>
      {recentTools.map(toolId => {
        const tool = toolMap.get(toolId)
        if (!tool) return null
        const isActive = toolId === currentToolId
        
        return (
          <button
            key={toolId}
            onClick={() => handleToolClick(toolId)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              isActive
                ? 'bg-[var(--color-accent-blue)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tool.icon}
            <span>{tool.label}</span>
          </button>
        )
      })}
    </div>
  )
}
