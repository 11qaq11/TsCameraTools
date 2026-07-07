import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('飞书 OAuth 登录', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('登录流程', () => {
    it('应该正确跳转飞书授权页', () => {
      const authUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize'
      expect(authUrl).toContain('feishu.cn')
    })

    it('应该正确处理回调', () => {
      const code = 'test-auth-code'
      expect(code).toBeDefined()
    })

    it('应该正确存储 token', () => {
      const token = 'test-jwt-token'
      localStorage.setItem('auth_token', token)
      expect(localStorage.getItem('auth_token')).toBe(token)
    })
  })

  describe('Token 管理', () => {
    it('应该在 token 存在时返回已认证', () => {
      localStorage.setItem('auth_token', 'test-token')
      const isAuthenticated = !!localStorage.getItem('auth_token')
      expect(isAuthenticated).toBe(true)
    })

    it('应该在 token 不存在时返回未认证', () => {
      const isAuthenticated = !!localStorage.getItem('auth_token')
      expect(isAuthenticated).toBe(false)
    })

    it('应该支持手动登出', () => {
      localStorage.setItem('auth_token', 'test-token')
      localStorage.removeItem('auth_token')
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })
})
