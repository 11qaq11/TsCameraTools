import { useLocation } from 'react-router-dom'
import { navItems } from '../config/navigation'

function Header() {
  const location = useLocation()
  const currentItem = navItems.find(item => item.path === location.pathname)
  const title = currentItem?.label || 'TsCameraTools'

  return (
    <header className="flex h-14 items-center border-b border-[var(--color-border)] bg-[var(--color-card-bg)] px-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] font-mono">{title}</h2>
    </header>
  )
}

export default Header
