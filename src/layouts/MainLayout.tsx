import { Navigate, Routes, Route } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ToolBar from '../components/ToolBar'
import { LogViewer } from '../components/LogViewer'
import Devices from '../pages/Devices'
import MemoryAnalysis from '../pages/MemoryAnalysis'
import UserManagement from '../pages/admin/UserManagement'
import SystemLogs from '../pages/admin/SystemLogs'
import SystemConfig from '../pages/admin/SystemConfig'
import Feedback from '../pages/Feedback'
import FeedbackList from '../pages/admin/FeedbackList'

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ToolBar />
        <main className="flex flex-col flex-1 overflow-hidden px-6 pt-6 pb-6 bg-[var(--color-background)]">
          <Routes>
            <Route path="/" element={isElectron ? <Devices /> : <Navigate to="/admin/users" replace />} />
            <Route path="/memory" element={<MemoryAnalysis />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/logs" element={<SystemLogs />} />
            <Route path="/admin/config" element={<SystemConfig />} />
            <Route path="/admin/feedback" element={<FeedbackList />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </main>
      </div>
      <LogViewer />
    </div>
  )
}

export default MainLayout
