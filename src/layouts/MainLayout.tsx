import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { LogViewer } from '../components/LogViewer'

function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-background)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden px-6 pt-6 bg-[var(--color-background)]">
          <Outlet />
        </main>
      </div>
      <LogViewer />
    </div>
  )
}

export default MainLayout
