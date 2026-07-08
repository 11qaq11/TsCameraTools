import { Smartphone, Terminal } from 'lucide-react'
import type { NavItem } from '../types'

export const navItems: NavItem[] = [
  {
    id: 'devices',
    label: '设备连接',
    icon: <Smartphone size={20} />,
    path: '/',
    group: '工具',
  },
  {
    id: 'terminal',
    label: '本地终端',
    icon: <Terminal size={20} />,
    path: '/terminal',
    group: '工具',
  },
]
