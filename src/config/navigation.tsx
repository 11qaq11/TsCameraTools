import { MemoryStick, Smartphone, MessageSquare } from 'lucide-react'
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
    id: 'memory',
    label: '内存分析',
    icon: <MemoryStick size={20} />,
    path: '/memory',
    group: '工具',
  },
  {
    id: 'feedback',
    label: '用户反馈',
    icon: <MessageSquare size={20} />,
    path: '/feedback',
    group: '工具',
  },
]
