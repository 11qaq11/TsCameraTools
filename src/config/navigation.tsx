import { Smartphone } from 'lucide-react'
import type { NavItem } from '../types'

export const navItems: NavItem[] = [
  {
    id: 'devices',
    label: '设备连接',
    icon: <Smartphone size={20} />,
    path: '/',
    group: '工具',
  },
]
