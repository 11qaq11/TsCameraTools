import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': '设备连接',
}

function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'TsCameraTools'

  return (
    <header className="flex h-14 items-center border-b border-border bg-white px-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
    </header>
  )
}

export default Header
