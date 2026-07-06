import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Devices from './pages/DevicesWeb'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import { isAuthenticated } from './utils/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login/callback" element={<AuthCallback />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Devices />} />
      </Route>
    </Routes>
  )
}

export default App
