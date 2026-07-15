import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import AuthCallback from './AuthCallback'

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
    const user = { id: '1', name: 'Test', email: 't@t.com', avatar: '', tenantKey: 'k' }
    const token = btoa(JSON.stringify(user))
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

  it('有效 token 时解析 user_info 并存储', () => {
    const user = { id: '1', name: 'Test', email: 't@t.com' }
    const token = btoa(JSON.stringify(user))
    withHash(`#/login/callback?token=${token}`)

    render(<AuthCallback />)

    const stored = localStorage.getItem('user_info')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).id).toBe('1')
    expect(JSON.parse(stored!).name).toBe('Test')
  })
})
