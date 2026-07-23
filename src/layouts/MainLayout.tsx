import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ToolBar from '../components/ToolBar'
import { LogViewer } from '../components/LogViewer'
import Devices from '../pages/Devices'
import DevicesWeb from '../pages/DevicesWeb'
import MemoryAnalysis from '../pages/MemoryAnalysis'
import UserManagement from '../pages/admin/UserManagement'
import SystemLogs from '../pages/admin/SystemLogs'
import SystemConfig from '../pages/admin/SystemConfig'

// ponytail: Electron vs Web 模式检测，后续工具市场统一管理
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

function MainLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ToolBar />
        <main className="flex flex-col flex-1 overflow-hidden px-6 pt-6 pb-6 bg-[var(--color-background)]">
          <div className={`flex flex-col flex-1 min-h-0 ${location.pathname === '/' ? '' : 'hidden'}`}>
            {isElectron ? <Devices /> : <DevicesWeb />}
          </div>
          <div className={`relative flex flex-col flex-1 min-h-0 ${location.pathname === '/memory' ? '' : 'hidden'}`}>
            <MemoryAnalysis />
          </div>
          <div className={`relative flex flex-col flex-1 min-h-0 ${location.pathname === '/admin/users' ? '' : 'hidden'}`}>
            <UserManagement />
          </div>
          <div className={`relative flex flex-col flex-1 min-h-0 ${location.pathname === '/admin/logs' ? '' : 'hidden'}`}>
            <SystemLogs />
          </div>
          <div className={`relative flex flex-col flex-1 min-h-0 ${location.pathname === '/admin/config' ? '' : 'hidden'}`}>
            <SystemConfig />
          </div>
        </main>
      </div>
      <LogViewer />
    </div>
  )
}

export default MainLayout
