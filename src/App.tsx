import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Devices from './pages/Devices'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Devices />} />
      </Route>
    </Routes>
  )
}

export default App
