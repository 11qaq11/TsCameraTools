import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import AuthCallback from './AuthCallback'

const mockMeApi = vi.fn()
vi.stubGlobal('fetch', mockMeApi)

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('AuthCallback', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const withHash = (hash: string) => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash, replace: vi.fn() },
      writable: true,
    })
  }

  it('有 token 时存储到 localStorage', () => {
    mockMeApi.mockResolvedValue({
      json: () => Promise.resolve({ user: { id: 1, name: 'Test', email: 't@t.com', avatar: '', tenant_key: '' } })
    })
    const token = 'test-uuid-session-id'
    withHash(`#/login/callback?token=${token}`)

    render(<AuthCallback />)

    expect(localStorage.getItem('auth_token')).toBe(token)
  })

  it('无 token 时不设置 auth_token', () => {
    withHash('#/login/callback')

    render(<AuthCallback />)

    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('渲染加载状态', () => {
    withHash('#/login/callback')

    const { getByText } = render(<AuthCallback />)
    expect(getByText('正在完成登录...')).toBeInTheDocument()
  })

  it('有效 token 时通过 API 获取 user_info 并存储', async () => {
    const token = 'test-uuid-session-id'
    withHash(`#/login/callback?token=${token}`)

    mockMeApi.mockResolvedValue({
      json: () => Promise.resolve({ user: { id: 1, name: 'Test', email: 't@t.com', avatar: '', tenant_key: '' } })
    })

    render(<AuthCallback />)

    await waitFor(() => {
      const stored = localStorage.getItem('user_info')
      expect(stored).not.toBeNull()
      if (stored) {
        expect(JSON.parse(stored).id).toBe(1)
        expect(JSON.parse(stored).name).toBe('Test')
      }
    })

    expect(mockMeApi).toHaveBeenCalledWith('/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  })
})
