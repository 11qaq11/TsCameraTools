import { Users, ScrollText, Settings } from 'lucide-react'
import type { NavItem } from '../types'

export const adminNavItems: NavItem[] = [
  {
    id: 'admin-users',
    label: '用户管理',
    icon: <Users size={20} />,
    path: '/admin/users',
    group: '管理',
  },
  {
    id: 'admin-logs',
    label: '操作日志',
    icon: <ScrollText size={20} />,
    path: '/admin/logs',
    group: '管理',
  },
  {
    id: 'admin-config',
    label: '系统配置',
    icon: <Settings size={20} />,
    path: '/admin/config',
    group: '管理',
  },
]
