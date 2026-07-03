import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import ImageViewer from './pages/ImageViewer'
import CameraConfig from './pages/CameraConfig'
import ImageProcess from './pages/ImageProcess'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="viewer" element={<ImageViewer />} />
        <Route path="camera" element={<CameraConfig />} />
        <Route path="process" element={<ImageProcess />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
