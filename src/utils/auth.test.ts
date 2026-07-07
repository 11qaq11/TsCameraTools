import { describe, it, expect, beforeEach } from 'vitest'
import { isAuthenticated, getAuthToken, logout } from './auth'

describe('auth utils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getAuthToken', () => {
    it('应该在 token 存在时返回 token', () => {
      localStorage.setItem('auth_token', 'test-token')
      expect(getAuthToken()).toBe('test-token')
    })

    it('应该在 token 不存在时返回 null', () => {
      expect(getAuthToken()).toBeNull()
    })
  })

  describe('logout', () => {
    it('应该正确删除 token', () => {
      localStorage.setItem('auth_token', 'test-token')
      logout()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('应该在 token 存在时返回 true', () => {
      localStorage.setItem('auth_token', 'test-token')
      expect(isAuthenticated()).toBe(true)
    })

    it('应该在 token 不存在时返回 false', () => {
      expect(isAuthenticated()).toBe(false)
    })
  })
})
