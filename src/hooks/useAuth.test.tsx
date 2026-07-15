import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { type ReactNode } from 'react'

vi.mock('../utils/auth', () => ({
  getAuthToken: vi.fn(() => null),
  getUserInfo: vi.fn(() => null),
  logout: vi.fn(),
}))

import { useAuth } from './useAuth'
import { getAuthToken, getUserInfo, logout } from '../utils/auth'

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('无 token 时返回未认证状态', () => {
    vi.mocked(getAuthToken).mockReturnValue(null)
    vi.mocked(getUserInfo).mockReturnValue(null)

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('有 token 和 userInfo 时返回认证状态', () => {
    const mockUser = { id: '1', name: 'Test', email: 't@t.com', avatar: '', tenantKey: 'k' }
    vi.mocked(getAuthToken).mockReturnValue('token-123')
    vi.mocked(getUserInfo).mockReturnValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
  })

  it('loading 从 true 变为 false', () => {
    vi.mocked(getAuthToken).mockReturnValue(null)

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(false)
  })

  it('logout 清除状态并跳转到 /login', () => {
    const mockUser = { id: '1', name: 'Test', email: 't@t.com', avatar: '', tenantKey: 'k' }
    vi.mocked(getAuthToken).mockReturnValue('token')
    vi.mocked(getUserInfo).mockReturnValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(true)

    act(() => { result.current.logout() })

    expect(logout).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
