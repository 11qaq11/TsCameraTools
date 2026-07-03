import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
  path: string
  badge?: string
}

export interface ToolPlugin {
  id: string
  name: string
  description: string
  icon: ReactNode
  component: React.ComponentType
  category: ToolCategory
}

export type ToolCategory = 'camera' | 'image' | 'analysis' | 'utility'
