import { describe, it, expect } from 'vitest'
import { navItems } from './navigation'

describe('navigation config', () => {
  it('应该包含至少一个导航项', () => {
    expect(navItems.length).toBeGreaterThan(0)
  })

  it('每个导航项的 id 应该唯一', () => {
    const ids = navItems.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每个导航项的 path 应该唯一', () => {
    const paths = navItems.map(item => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('每个导航项应该有 label 和 icon', () => {
    navItems.forEach(item => {
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
    })
  })

  it('path 应该以 / 开头', () => {
    navItems.forEach(item => {
      expect(item.path).toMatch(/^\//)
    })
  })
})
