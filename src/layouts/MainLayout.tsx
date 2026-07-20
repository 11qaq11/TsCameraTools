import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ToolBar from '../components/ToolBar'
import { LogViewer } from '../components/LogViewer'
import DevicesWeb from '../pages/DevicesWeb'
import LocalTerminal from '../pages/LocalTerminal'
import MemoryAnalysis from '../pages/MemoryAnalysis'

function MainLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ToolBar />
        <main className="flex flex-col flex-1 overflow-hidden px-6 pt-6 pb-6 bg-[var(--color-background)]">
          {/* 保持所有页面挂载，通过 CSS 显示/隐藏 */}
          <div className={`flex flex-col flex-1 min-h-0 ${location.pathname === '/' ? '' : 'hidden'}`}>
            <DevicesWeb />
          </div>
          <div className={`flex flex-col flex-1 min-h-0 ${location.pathname === '/terminal' ? '' : 'hidden'}`}>
            <LocalTerminal />
          </div>
          <div className={`relative flex flex-col flex-1 min-h-0 ${location.pathname === '/memory' ? '' : 'hidden'}`}>
            <MemoryAnalysis />
          </div>
        </main>
      </div>
      <LogViewer />
    </div>
  )
}

export default MainLayout
